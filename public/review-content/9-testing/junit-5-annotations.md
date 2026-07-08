# JUnit 5 Annotations

**Breadcrumb:** 9. Testing › Unit Test

> JUnit 5 cung cấp lifecycle annotation, conditional execution, nhóm với @Nested và extension point qua @ExtendWith — cải thiện tổ chức test.

## Các điểm chính

- ✦ <code>@Test</code>: đánh dấu test method. <code>@DisplayName("...")</code>: tên test dễ đọc.
- ✦ <code>@BeforeEach</code>/<code>@AfterEach</code>: setup/teardown trước/sau mỗi test.
- ✦ <code>@BeforeAll</code>/<code>@AfterAll</code>: một lần mỗi class (phải là <code>static</code> trừ khi dùng <code>@TestInstance(PER_CLASS)</code>).
- ✦ <code>@Nested</code>: nested test class để nhóm scenario liên quan.
- ✦ <code>@ExtendWith(MockitoExtension.class)</code>: bật annotation <code>@Mock</code>, <code>@InjectMocks</code>.
- ✦ <code>@Disabled("reason")</code>: bỏ qua test. <code>@Tag("slow")</code>: phân loại để chạy chọn lọc.

*Full JUnit 5 class với @BeforeAll/@BeforeEach/@Nested/@DisplayName/@Tag/@Disabled*
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService Unit Tests")
@Tag("unit")
class OrderServiceTest {

    @Mock  OrderRepository   orderRepo;
    @Mock  PaymentGateway    paymentGateway;
    @Mock  EmailService      emailService;
    @InjectMocks OrderService service;

    // ── Shared fixtures ──────────────────────────────────────────────────────
    private static User vipUser;
    private        Order pendingOrder;

    @BeforeAll  // runs once — static, sets up expensive shared data
    static void initSharedData() {
        vipUser = new User(1L, "Alice", "alice@example.com", UserType.VIP);
    }

    @BeforeEach  // runs before EACH test — reset per-test state
    void setUp() {
        pendingOrder = new Order("u1", List.of(new OrderItem("p1", 2, new BigDecimal("50.00"))));
        pendingOrder.setId(101L);
    }

    @AfterEach  // verify no unexpected interactions after each test
    void tearDown() {
        verifyNoMoreInteractions(emailService);
    }

    // ── @Nested: group tests by method / scenario ────────────────────────────
    @Nested
    @DisplayName("placeOrder()")
    class PlaceOrder {

        @Test
        @DisplayName("should save order and charge payment for valid request")
        void validRequest_savesAndChargesPayment() {
            // Arrange
            when(paymentGateway.charge(any())).thenReturn(new ChargeResult("ch_abc123"));
            when(orderRepo.save(any())).thenReturn(pendingOrder);
            // Act
            Order result = service.placeOrder(new OrderRequest("u1", pendingOrder.getItems()));
            // Assert
            assertAll(
                () -> assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED),
                () -> verify(orderRepo).save(any(Order.class)),
                () -> verify(paymentGateway).charge(any()),
                () -> verify(emailService).sendConfirmation(eq("u1"), eq(101L))
            );
        }

        @Test
        @DisplayName("should throw PaymentException and NOT save order when payment fails")
        void paymentFails_throwsAndDoesNotSave() {
            when(paymentGateway.charge(any())).thenThrow(new GatewayException("card declined"));
            assertThrows(PaymentException.class,
                () -> service.placeOrder(new OrderRequest("u1", pendingOrder.getItems())));
            verify(orderRepo, never()).save(any()); // order must NOT be persisted
        }
    }

    @Nested
    @DisplayName("cancelOrder()")
    class CancelOrder {

        @Test
        @DisplayName("should set status CANCELLED and refund payment")
        void confirmedOrder_cancelsAndRefunds() {
            pendingOrder.setStatus(OrderStatus.CONFIRMED);
            when(orderRepo.findById(101L)).thenReturn(Optional.of(pendingOrder));
            service.cancelOrder(101L);
            assertThat(pendingOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            verify(paymentGateway).refund(pendingOrder.getChargeId());
        }

        @Test @DisplayName("should throw when order already cancelled")
        void alreadyCancelled_throws() {
            pendingOrder.setStatus(OrderStatus.CANCELLED);
            when(orderRepo.findById(101L)).thenReturn(Optional.of(pendingOrder));
            assertThrows(InvalidStateException.class, () -> service.cancelOrder(101L));
        }
    }

    @Test
    @Disabled("Flaky due to timezone issue — tracked in JIRA-456")
    @Tag("slow")
    void legacyBatchProcessing_skipped() { /* TODO */ }
}
```

### 💡 Lời khuyên thực tế

Dùng `@Nested` để nhóm test theo method — tạo output rõ ràng và giữ class có tổ chức. Dùng `@DisplayName` cho mô tả dễ đọc theo business.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa @BeforeEach và @BeforeAll?</b></summary>

@BeforeEach chạy trước mỗi phương thức test trong class. @BeforeAll chỉ chạy một lần duy nhất trước khi bất kỳ bài test nào trong class bắt đầu (phương thức này bắt buộc phải là static).
</details>

<details>
<summary><b>Q: @ExtendWith hoạt động thế nào?</b></summary>

Dùng để đăng ký các Extension của JUnit 5 nhằm mở rộng tính năng cho test (như tích hợp Spring TestContext thông qua `@ExtendWith(SpringExtension.class)` hoặc mockito thông qua MockitoExtension).
</details>

<details>
<summary><b>Q: Khi nào @TestInstance(PER_CLASS) hữu ích?</b></summary>

Hữu ích khi bạn muốn chia sẻ trạng thái (state) giữa các phương thức test trong cùng một class, hoặc khi muốn viết các phương thức `@BeforeAll` và `@AfterAll` dưới dạng non-static.
</details>
