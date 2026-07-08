# Mockito: Mock, Spy, Captor

**Breadcrumb:** 9. Testing › Mocking

> Mockito cung cấp ba loại test double: Mock (kiểm soát hoàn toàn), Spy (fake một phần bọc object thật) và ArgumentCaptor (capture argument để assertion).

## Các điểm chính

- ✦ <code>@Mock</code>: tất cả method trả về default; có thể verify.
- ✦ <code>@Spy</code>: gọi method thật theo default; stub từng cái cụ thể.
- ✦ <code>@InjectMocks</code>: Mockito tạo class đang test và inject mock/spy.
- ✦ <code>doReturn(val).when(spy).method()</code>: dùng cú pháp này cho spy (tránh gọi method thật khi stubbing).
- ✦ <code>verify(mock, times(2)).method()</code> / <code>verify(mock, never()).method()</code>.

*OrderService test với @Mock/@Spy/@Captor — verify argument details và interaction order*
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("Mockito: Mock / Spy / Captor")
class OrderServiceMockitoTest {

    @Mock  OrderRepository  orderRepo;
    @Mock  EmailService     emailService;
    @Spy   OrderCalculator  calculator = new OrderCalculator();   // SPY: real object
    @Captor ArgumentCaptor<Order>        orderCaptor;
    @Captor ArgumentCaptor<EmailRequest> emailCaptor;
    @InjectMocks OrderService service;

    // ── MOCK: full control, no real method called ────────────────────────────
    @Test
    @DisplayName("mock: verify order is saved with CONFIRMED status")
    void placeOrder_mockRepo_savesConfirmedOrder() {
        when(orderRepo.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(42L);           // simulate DB-generated ID
            return o;
        });
        service.placeOrder(new OrderRequest("u1", List.of(item("p1", 2, 50))));

        verify(orderRepo).save(orderCaptor.capture());
        Order saved = orderCaptor.getValue();
        assertAll(
            () -> assertThat(saved.getStatus()).isEqualTo(OrderStatus.CONFIRMED),
            () -> assertThat(saved.getUserId()).isEqualTo("u1"),
            () -> assertThat(saved.getTotal()).isEqualByComparingTo("100.00")
        );
    }

    // ── CAPTOR: inspect what was passed to email service ─────────────────────
    @Test
    @DisplayName("captor: email sent to correct address with correct amount")
    void placeOrder_sendsConfirmationEmail_withCorrectDetails() {
        when(orderRepo.save(any())).thenReturn(confirmedOrder());
        service.placeOrder(new OrderRequest("u1", List.of(item("p1", 1, 200))));

        verify(emailService).send(emailCaptor.capture());
        EmailRequest email = emailCaptor.getValue();
        assertAll(
            () -> assertThat(email.getTo()).isEqualTo("u1@example.com"),
            () -> assertThat(email.getSubject()).contains("Order Confirmation"),
            () -> assertThat(email.getBody()).contains("200.00")
        );
    }

    // ── SPY: real method called by default, stub specific method ─────────────
    @Test
    @DisplayName("spy: real calculateTotal() used, but applyVipDiscount() stubbed")
    void placeOrder_vipUser_realCalculatorWithStubbedDiscount() {
        // BAD way with spy → doReturn().when() to avoid calling real method prematurely
        doReturn(new BigDecimal("80.00")).when(calculator).applyVipDiscount(any());

        Order result = service.placeOrderForVip("u1", List.of(item("p1", 1, 100)));

        // Real calculateTotal() was called (not stubbed)
        verify(calculator).calculateTotal(any());          // real method invoked
        verify(calculator).applyVipDiscount(any());        // stubbed: returns 80.00
        assertThat(result.getTotal()).isEqualByComparingTo("80.00");
    }

    // ── verify interaction count and order ───────────────────────────────────
    @Test
    @DisplayName("verify: email sent exactly once, repo saved before email")
    void placeOrder_interactionOrder_repoBeforeEmail() {
        when(orderRepo.save(any())).thenReturn(confirmedOrder());
        service.placeOrder(new OrderRequest("u1", List.of(item("p1", 1, 50))));

        InOrder inOrder = inOrder(orderRepo, emailService);
        inOrder.verify(orderRepo).save(any());          // repo first
        inOrder.verify(emailService).send(any());       // then email
        verify(emailService, times(1)).send(any());     // exactly once
        verify(emailService, never()).sendFailure(any()); // no failure email
    }

    private OrderItem item(String productId, int qty, double price) {
        return new OrderItem(productId, qty, new BigDecimal(price + ""));
    }
    private Order confirmedOrder() {
        Order o = new Order("u1", List.of()); o.setId(1L); o.setStatus(OrderStatus.CONFIRMED);
        return o;
    }
}
```

### 💡 Lời khuyên thực tế

Ưu tiên mock hơn spy. Spy trên object thật thường báo hiệu class đang test quá coupled với collaborator. Chỉ dùng spy cho partial mocking của legacy code khó refactor.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa spy() và mock()?</b></summary>

mock() tạo ra đối tượng giả lập hoàn toàn (mọi hàm mặc định không làm gì hoặc trả về null). spy() tạo đối tượng bọc quanh một instance thật (mọi hàm mặc định chạy code thật trừ khi bị stub).
</details>

<details>
<summary><b>Q: Tại sao dùng doReturn() thay vì when().thenReturn() với spy?</b></summary>

Vì nếu dùng `when(spy.someMethod()).thenReturn(...)`, Java vẫn thực sự chạy vào code của `spy.someMethod()` trước khi stub, có thể gây lỗi runtime hoặc NullPointerException. `doReturn(...).when(spy).someMethod()` sẽ bypass code thật và thực hiện stub an toàn.
</details>

<details>
<summary><b>Q: @InjectMocks inject mock thế nào?</b></summary>

Mockito tự động quét và inject các trường được đánh dấu `@Mock` hoặc `@Spy` vào trong class được khai báo `@InjectMocks` thông qua constructor injection, setter injection, hoặc field injection.
</details>
