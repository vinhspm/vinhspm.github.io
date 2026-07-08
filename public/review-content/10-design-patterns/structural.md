# Structural Patterns

**Breadcrumb:** 10. Design Patterns

> Structural pattern kết hợp object thành cấu trúc lớn hơn — Adapter (chuyển đổi interface), Decorator (thêm hành vi), Facade (đơn giản hóa), Proxy (kiểm soát truy cập).

## Các điểm chính

- ✦ **Adapter**: interface không tương thích → tương thích. "Wrapper cho interface mismatch".
- ✦ **Decorator**: thêm hành vi động, cùng interface. Stack nhiều decorator.
- ✦ **Facade**: interface đơn giản cho subsystem phức tạp. Ẩn độ phức tạp.
- ✦ **Proxy**: surrogate object kiểm soát truy cập. Dùng bởi Spring AOP.
- ✦ Cả bốn đều bọc object — intent khác nhau: Adapter chuyển đổi, Decorator thêm, Facade đơn giản hóa, Proxy kiểm soát.

*4 Structural Patterns: Adapter / Decorator / Facade / Proxy — đặt cạnh nhau*
```java
// ── ADAPTER: convert incompatible interface ──────────────────────────────────
// Old payment API we cannot modify
interface LegacyPaymentGateway { void pay(String cardNum, double amount, String cur); }
// Our modern interface
interface PaymentGateway { ChargeResult charge(ChargeRequest req); }
// Adapter bridges the gap
class LegacyPaymentAdapter implements PaymentGateway {
    private final LegacyPaymentGateway legacy;
    public ChargeResult charge(ChargeRequest req) {
        legacy.pay(req.getCardNumber(), req.getAmountAsDouble(), req.getCurrency());
        return new ChargeResult("OK-" + System.currentTimeMillis());
    }
}
// Client code uses modern interface — unaware of legacy underneath
PaymentGateway gw = new LegacyPaymentAdapter(new OldBankGateway());
gw.charge(new ChargeRequest("4111...", 9999, "USD"));

// ── DECORATOR: add behavior dynamically without subclassing ──────────────────
interface OrderService { Order placeOrder(OrderRequest req); }
class OrderServiceImpl implements OrderService { /* core logic */ }

class LoggingOrderService implements OrderService {
    private final OrderService delegate;
    LoggingOrderService(OrderService d) { this.delegate = d; }
    public Order placeOrder(OrderRequest req) {
        log.info("Placing order userId={} items={}", req.getUserId(), req.getItemCount());
        Order result = delegate.placeOrder(req);
        log.info("Order placed orderId={} total={}", result.getId(), result.getTotal());
        return result;
    }
}
// Chain: Metrics → Logging → Core
OrderService service = new MetricsOrderService(new LoggingOrderService(new OrderServiceImpl()));

// ── FACADE: simple interface hiding complex subsystem ─────────────────────────
@Service class CheckoutFacade {   // hides inventory + payment + email coordination
    public OrderResult checkout(CartRequest cart) {
        inventoryService.reserve(cart.getItems());       // subsystem 1
        PaymentResult pay = paymentService.charge(cart); // subsystem 2
        emailService.sendConfirmation(cart.getUserId()); // subsystem 3
        return new OrderResult(pay.getTransactionId());
    }
}

// ── PROXY: control access to object ──────────────────────────────────────────
// Spring AOP proxy (conceptual — applied via @Transactional)
// @Transactional on placeOrder() causes Spring to create a CGLIB proxy:
// proxy.placeOrder() → begin tx → target.placeOrder() → commit/rollback tx
// That's why self-invocation (this.placeOrder()) bypasses @Transactional
```

### 💡 Lời khuyên thực tế

Spring AOP implement Proxy và Decorator một cách trong suốt — @Transactional, @Cacheable, @Async đều là decorator được áp dụng qua proxy. Hiểu điều này giải thích vấn đề self-invocation bypass.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Java I/O dùng Decorator thế nào?</b></summary>

Dùng các lớp bọc (wrappers) để chồng thêm chức năng, ví dụ bọc FileInputStream bằng BufferedInputStream để thêm tính năng đọc đệm tăng tốc độ I/O.
</details>
