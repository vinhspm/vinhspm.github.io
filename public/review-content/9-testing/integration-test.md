# Integration Testing

**Breadcrumb:** 9. Testing

> Integration test kiểm tra nhiều component hoạt động cùng nhau — test real database query, Spring wiring, HTTP layer và transaction behavior mà unit test không thể bắt được.

## Các điểm chính

- ✦ Chậm hơn unit test nhưng bắt được wiring bug, SQL issue, mapping error, transaction problem.
- ✦ <code>@SpringBootTest</code>: load full hoặc partial application context.
- ✦ <code>@DataJpaTest</code>: JPA slice — chỉ load JPA context + embedded DB (test repository nhanh).
- ✦ <code>@WebMvcTest</code>: web layer slice — load controller + MockMvc (test controller nhanh).
- ✦ TestContainers: real Docker DB/Redis/Kafka cho test — bắt được DB-specific issue mà H2 bỏ qua.

*@SpringBootTest + MockMvc: full CRUD flow với JWT, TestContainers, @MockBean EmailService*
```java
// ── @SpringBootTest: full context + MockMvc CRUD flow ───────────────────────
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class OrderApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("orders_test");

    @DynamicPropertySource
    static void configureDb(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired OrderRepository orderRepository;
    @MockBean  EmailService emailService;   // avoid real email in tests

    private String jwtToken;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();       // clean slate per test
        jwtToken = "Bearer " + generateTestJwt("user-1", "ROLE_USER");
    }

    @Test
    @DisplayName("POST /api/orders → 201 with location header")
    void createOrder_validRequest_returns201() throws Exception {
        OrderRequest req = new OrderRequest("user-1",
            List.of(new OrderItem("product-a", 2, new BigDecimal("49.99"))));

        mockMvc.perform(post("/api/orders")
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.total").value(99.98))
            .andExpect(jsonPath("$.orderId").isNotEmpty());

        verify(emailService).sendConfirmation(eq("user-1"), any());
    }

    @Test
    @DisplayName("GET /api/orders/{id} → 200 with correct order data")
    void getOrder_existingId_returns200() throws Exception {
        Order saved = orderRepository.save(
            new Order("user-1", List.of(new OrderItem("p1", 1, new BigDecimal("29.99")))));

        mockMvc.perform(get("/api/orders/" + saved.getId())
                .header("Authorization", jwtToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("user-1"))
            .andExpect(jsonPath("$.items[0].productId").value("p1"));
    }

    @Test
    @DisplayName("DELETE /api/orders/{id} → 204, order cancelled in DB")
    void cancelOrder_confirmedOrder_returns204() throws Exception {
        Order saved = orderRepository.save(confirmedOrder("user-1"));

        mockMvc.perform(delete("/api/orders/" + saved.getId())
                .header("Authorization", jwtToken))
            .andExpect(status().isNoContent());

        Order updated = orderRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("POST /api/orders without JWT → 401 Unauthorized")
    void createOrder_missingJwt_returns401() throws Exception {
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest())))
            .andExpect(status().isUnauthorized());
    }
}
```

### 💡 Lời khuyên thực tế

Dùng slice test để tăng tốc: @DataJpaTest cho repo, @WebMvcTest cho controller, chỉ @SpringBootTest đầy đủ cho end-to-end path. Spring cache context — đừng phá nó bằng @MockBean quá nhiều.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa @SpringBootTest và @DataJpaTest?</b></summary>

@SpringBootTest khởi tạo toàn bộ Spring Application Context đầy đủ (tốn thời gian, nặng). @DataJpaTest là một slice test, chỉ khởi tạo các thành phần liên quan đến tầng JPA/Database (như Repository, EntityManager, DataSource) giúp chạy nhanh hơn.
</details>

<details>
<summary><b>Q: Tại sao ưu tiên TestContainers hơn H2 cho JPA test?</b></summary>

H2 là in-memory database nên có nhiều hàm đặc thù, kiểu dữ liệu hoặc cơ chế transaction khác biệt so với database thực tế chạy production (như PostgreSQL, MySQL). TestContainers chạy database thực trong Docker nên đảm bảo hành vi chạy test giống hệt môi trường thật 100%.
</details>

<details>
<summary><b>Q: Slice test cải thiện CI speed thế nào?</b></summary>

Bằng cách cô lập và chỉ khởi động một phần nhỏ Spring context cần thiết cho bài test đó (ví dụ chỉ load Web layer với `@WebMvcTest`), giúp giảm thời gian khởi chạy Spring từ hàng chục giây xuống còn vài giây.
</details>
