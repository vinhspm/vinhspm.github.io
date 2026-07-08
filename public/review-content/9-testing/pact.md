# Pact

**Breadcrumb:** 9. Testing › Contract Testing

> Pact là framework consumer-driven contract testing hàng đầu — consumer viết interaction test, Pact tạo JSON contract và provider verify tự động.

## Các điểm chính

- ✦ Consumer test → contract <code>pact.json</code> → publish lên Pact Broker.
- ✦ Provider CI: download contract, chạy setup <code>@State</code>, verify interaction với real service.
- ✦ <code>@State("user 1 exists")</code>: thiết lập precondition trong provider trước mỗi interaction.
- ✦ <code>can-i-deploy</code>: kiểm tra consumer+provider version có compatible trước khi deploy.
- ✦ Cũng hỗ trợ messaging contract (Kafka, RabbitMQ).

*Provider verification: @State setup, Pact Broker integration, can-i-deploy gate*
```java
// ── Provider side: user-service verifies ALL consumer contracts ─────────────
@Provider("user-service")
@PactBroker(
    url = "https://pact-broker.example.com",
    authentication = @PactBrokerAuth(token = "${PACT_BROKER_TOKEN}"),
    // Only verify contracts for consumers that want to deploy to "production"
    consumerVersionSelectors = @VersionSelector(deployedOrReleased = true)
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class UserServicePactVerificationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureDb(DynamicPropertyRegistry reg) {
        reg.add("spring.datasource.url",      postgres::getJdbcUrl);
        reg.add("spring.datasource.username", postgres::getUsername);
        reg.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort int port;
    @Autowired UserRepository userRepository;

    // Required: delegate each interaction to Pact framework
    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @BeforeEach
    void configureTarget(PactVerificationContext context) {
        // Point Pact at our running Spring Boot instance
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    // ── Provider States: setup data for each interaction ─────────────────────
    @State("user with id 1 exists and is VIP")
    void setupVipUser() {
        userRepository.deleteAll();
        userRepository.save(User.builder()
            .id(1L)
            .name("Alice")
            .email("alice@example.com")
            .type(UserType.VIP)
            .active(true)
            .build());
    }

    @State("user with id 999 does not exist")
    void setupUserNotFound() {
        userRepository.deleteById(999L);    // ensure absent
    }

    // ── CI command to gate deployment ─────────────────────────────────────────
    // pact-broker can-i-deploy     //   --pacticipant user-service     //   --version ${GIT_SHA}     //   --to-environment production     //   --broker-base-url https://pact-broker.example.com
    // Exit code 1 → pipeline fails → deployment blocked
}
```

### 💡 Lời khuyên thực tế

Chạy `pact can-i-deploy --pacticipant user-service --version 1.2.3 --to-environment prod` trong CD pipeline trước khi deploy. Fail deployment nếu bất kỳ consumer contract nào bị phá vỡ.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Provider state trong Pact là gì?</b></summary>

Là thiết lập trạng thái dữ liệu cần có ở phía Provider trước khi chạy test hợp đồng (ví dụ: thiết lập trạng thái "User ID 10 tồn tại trong DB" để chuẩn bị cho request GET `/users/10` từ Consumer).
</details>

<details>
<summary><b>Q: can-i-deploy hoạt động thế nào?</b></summary>

Công cụ kiểm tra ma trận tương thích trên Pact Broker xem phiên bản ứng dụng chuẩn bị deploy đã vượt qua tất cả các bài kiểm tra hợp đồng với phiên bản của đối tác đang chạy ở môi trường đích chưa.
</details>

<details>
<summary><b>Q: Điều gì xảy ra khi provider thay đổi tên field API?</b></summary>

Bài test kiểm tra hợp đồng ở phía Provider CI sẽ lập tức thất bại vì dữ liệu trả về không khớp với cấu trúc trường dữ liệu cũ mà Consumer đã khai báo yêu cầu trong file contract JSON.
</details>
