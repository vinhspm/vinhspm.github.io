# @SpringBootTest

**Breadcrumb:** 9. Testing › Integration Test

> @SpringBootTest load full application context, cho phép end-to-end integration test với real wiring, trong khi @DynamicPropertySource và @MockBean cho phép override có kiểm soát.

## Các điểm chính

- ✦ <code>webEnvironment=MOCK</code>: mock servlet (default). Dùng với <code>MockMvc</code>.
- ✦ <code>webEnvironment=RANDOM_PORT</code>: server thật. Dùng với <code>TestRestTemplate</code> hoặc <code>WebTestClient</code>.
- ✦ Context caching: tái sử dụng qua các test cùng config — tránh phá cache với @MockBean mỗi test.
- ✦ <code>@DynamicPropertySource</code>: đăng ký TestContainers URL vào Spring property.
- ✦ <code>@MockBean</code>: thay thế bean trong context bằng Mockito mock.

*@SpringBootTest với TestContainers + @MockBean*
```java
@SpringBootTest(webEnvironment=RANDOM_PORT)
@Testcontainers
class OrderApiTest {
    @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void config(DynamicPropertyRegistry r){
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
    @Autowired TestRestTemplate rest;
    @MockBean EmailService emailService;

    @Test void createOrder_returns201(){
        ResponseEntity<OrderResponse> res = rest.postForEntity(
            "/api/orders", validRequest(), OrderResponse.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verify(emailService).sendConfirmation(any(), any());
    }
}
```

### 💡 Lời khuyên thực tế

Dùng @DynamicPropertySource để wire TestContainers vào Spring — đây là pattern chuẩn. Giữ @MockBean tối thiểu — mỗi combination @MockBean unique tạo context riêng, làm chậm test suite.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: @DynamicPropertySource làm gì?</b></summary>

Cho phép ghi đè các cấu hình thuộc tính Spring một cách động lúc runtime, cực kỳ hữu ích để gán cổng kết nối động (IP/Port) của container chạy bởi TestContainers vào Spring context.
</details>

<details>
<summary><b>Q: Khi nào dùng RANDOM_PORT vs MOCK?</b></summary>

Dùng MOCK (mặc định) khi chỉ cần test logic của controller bằng MockMvc không cần cổng mạng thật. Dùng RANDOM_PORT khi muốn chạy một server servlet thực tế trên cổng ngẫu nhiên để kiểm thử thực tế bằng TestRestTemplate hoặc WebTestClient.
</details>

<details>
<summary><b>Q: @MockBean ảnh hưởng đến Spring context caching thế nào?</b></summary>

Mỗi khi một test class sử dụng một cấu hình `@MockBean` mới hoặc khác nhau, Spring bắt buộc phải phá hủy cache cũ và khởi động lại một Context hoàn toàn mới (Context Dirties), làm chậm đáng kể tốc độ chạy test tổng thể.
</details>
