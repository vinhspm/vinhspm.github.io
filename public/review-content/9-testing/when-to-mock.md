# Khi Nào Nên Mock

**Breadcrumb:** 9. Testing › Mocking

> Mock external infrastructure (DB, HTTP, messaging); ĐỪNG mock value object, domain logic hoặc class đang test — over-mocking tạo ra test brittle pass ngay cả khi code bị hỏng.

## Các điểm chính

- ✦ **NÊN mock**: repository, HTTP client, message producer, email service, clock.
- ✦ **KHÔNG nên mock**: value object, domain entity, data class đơn giản, List/Map/String.
- ✦ **KHÔNG nên mock** class đang test — làm mất ý nghĩa test.
- ✦ Mock đau đớn = tín hiệu design: quá nhiều dependency hoặc sai abstraction level.

*Mock PaymentGateway/Repo (infrastructure) — test OrderCalculator trực tiếp (domain)*
```java
// ── GOOD: mock external infrastructure, test real business logic ────────────
@ExtendWith(MockitoExtension.class)
class OrderDiscountTest {
    @Mock UserRepository   userRepo;      // MOCK: external I/O
    @Mock PaymentGateway   paymentGw;     // MOCK: third-party HTTP
    @Mock EmailService     emailService;  // MOCK: side-effect service
    @InjectMocks OrderService service;

    @Test
    @DisplayName("VIP user gets 20% discount — real logic executed")
    void applyDiscount_vipUser_gets20Percent() {
        // Only mock the repo (I/O boundary); OrderService logic runs for real
        when(userRepo.findById(1L)).thenReturn(Optional.of(vipUser()));
        BigDecimal result = service.applyDiscount(1L, new BigDecimal("100.00"));
        assertThat(result).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("payment fails → order NOT saved, failure email sent")
    void placeOrder_paymentDeclined_noOrderSaved() {
        when(userRepo.findById(any())).thenReturn(Optional.of(regularUser()));
        when(paymentGw.charge(any())).thenThrow(new PaymentDeclinedException("insufficient funds"));
        assertThrows(PaymentException.class,
            () -> service.placeOrder(orderRequest()));
        // Real business rule: don't persist order if payment fails
        verify(emailService).sendPaymentFailure(eq("u1"), contains("insufficient funds"));
    }
}

// ── BAD: mocking the class under test — tests nothing real ──────────────────
// OrderService mockService = mock(OrderService.class);
// when(mockService.applyDiscount(any(), any())).thenReturn(new BigDecimal("80.00"));
// This is NOT a test — it just replays what you told the mock to return.

// ── GOOD: test pure domain object WITHOUT any mocks ─────────────────────────
class OrderCalculatorTest {          // No @ExtendWith, no mocks needed
    OrderCalculator calculator = new OrderCalculator();  // real object

    @Test void calculateTotal_multipleItems_sumsCorrectly() {
        List<OrderItem> items = List.of(
            new OrderItem("p1", 2, new BigDecimal("30.00")),  // 60.00
            new OrderItem("p2", 1, new BigDecimal("15.50"))   // 15.50
        );
        assertThat(calculator.calculateTotal(items)).isEqualByComparingTo("75.50");
    }

    @Test void applyDiscount_zeroPrice_returnsZero() {
        assertThat(calculator.applyDiscount(BigDecimal.ZERO, 20))
            .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test void money_add_sumsCorrectly() {
        assertThat(Money.of(100, "USD").add(Money.of(50, "USD")))
            .isEqualTo(Money.of(150, "USD"));
    }
}

// ── RULE: mock at service boundary, never mock domain ────────────────────────
// MOCK:   Repository, PaymentGateway, EmailClient, MessageProducer, Clock
// DON'T:  OrderCalculator, Money, OrderItem, UserType, discount rules
// SIGNAL: >5 mocks in one test → class has too many dependencies → split it
```

### 💡 Lời khuyên thực tế

Nguyên tắc: mock infrastructure (I/O), test domain. Test với 10+ mock là code smell — xem xét chia nhỏ class. Test chỉ verify interaction (không assertion state) thường pass ngay cả khi hành vi sai.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Rủi ro của over-mocking là gì?</b></summary>

Làm bài test trở nên quá nhạy cảm và dễ hỏng (fragile) khi cấu trúc code thay đổi nhỏ dù logic nghiệp vụ vẫn đúng, đồng thời che giấu các lỗi tích hợp thực tế giữa các class với nhau.
</details>

<details>
<summary><b>Q: Có nên mock class đang test không?</b></summary>

Không bao giờ. Class đang được kiểm thử (System Under Test - SUT) phải luôn chạy code thật 100% để đảm bảo kiểm thử chính xác hành vi của nó.
</details>

<details>
<summary><b>Q: Điều gì có nghĩa khi setup mock rất đau đớn?</b></summary>

Cho thấy class đó đang vi phạm nguyên tắc Single Responsibility (quá nhiều dependencies, ôm đồm quá nhiều việc) và cần phải được refactor chia nhỏ ra ngay lập tức.
</details>
