# Factory Method Pattern

**Breadcrumb:** 10. Design Patterns › Creational

> Factory Method định nghĩa interface để tạo object nhưng để subclass quyết định class nào sẽ được khởi tạo — hỗ trợ Open/Closed Principle.

## Các điểm chính

- ✦ Creator định nghĩa abstract <code>create()</code>; concrete creator override cho product cụ thể.
- ✦ Caller phụ thuộc vào interface, không phải concrete type — decoupled khỏi khởi tạo.
- ✦ Ví dụ Spring: inject tất cả implementation vào registry map — thêm type mới không cần thay đổi code hiện có.

*PaymentProcessorFactory: Stripe/PayPal/VNPay via Spring Map injection — OCP compliant*
```java
// ── Payment Processor Factory — returns correct impl by region/provider ─────
// Step 1: define interface with discriminator
interface PaymentProcessor {
    String getProvider();  // "STRIPE" | "PAYPAL" | "VNPAY"
    PaymentResult charge(ChargeRequest request);
    PaymentResult refund(String chargeId, BigDecimal amount);
}

// Step 2: concrete implementations — each a Spring @Component
@Component class StripeProcessor implements PaymentProcessor {
    public String getProvider() { return "STRIPE"; }
    public PaymentResult charge(ChargeRequest req) {
        // Stripe SDK call
        Charge charge = Stripe.charges.create(Map.of(
            "amount",   req.getAmountCents(),
            "currency", req.getCurrency().toLowerCase(),
            "source",   req.getCardToken()
        ));
        return new PaymentResult(charge.getId(), "SUCCEEDED");
    }
    public PaymentResult refund(String chargeId, BigDecimal amount) { /* ... */ return null; }
}

@Component class PayPalProcessor implements PaymentProcessor {
    public String getProvider() { return "PAYPAL"; }
    public PaymentResult charge(ChargeRequest req) { /* PayPal REST API */ return null; }
    public PaymentResult refund(String chargeId, BigDecimal amount) { /* ... */ return null; }
}

@Component class VNPayProcessor implements PaymentProcessor {
    public String getProvider() { return "VNPAY"; }
    public PaymentResult charge(ChargeRequest req) { /* VNPay integration */ return null; }
    public PaymentResult refund(String chargeId, BigDecimal amount) { /* ... */ return null; }
}

// Step 3: Factory — Spring auto-collects all implementations
@Component
public class PaymentProcessorFactory {
    private final Map<String, PaymentProcessor> registry;

    // Spring injects ALL PaymentProcessor beans — no manual wiring
    public PaymentProcessorFactory(List<PaymentProcessor> processors) {
        this.registry = processors.stream()
            .collect(Collectors.toMap(PaymentProcessor::getProvider, Function.identity()));
        // registry = { "STRIPE": StripeProcessor, "PAYPAL": PayPalProcessor, ... }
    }

    public PaymentProcessor getProcessor(String provider) {
        return Optional.ofNullable(registry.get(provider.toUpperCase()))
            .orElseThrow(() -> new UnsupportedPaymentProviderException(
                "No processor for provider: " + provider +
                ". Supported: " + registry.keySet()));
    }
}

// Step 4: Service uses factory — decoupled from concrete implementations
@Service
public class PaymentService {
    private final PaymentProcessorFactory factory;

    public PaymentResult processPayment(Order order, String provider) {
        PaymentProcessor processor = factory.getProcessor(provider);
        ChargeRequest request = ChargeRequest.from(order);
        return processor.charge(request);
    }
}

// Adding a new provider (e.g., MoMo):
// @Component class MoMoProcessor implements PaymentProcessor { ... }
// Zero changes to Factory, Service, or any other class — true OCP
```

### 💡 Lời khuyên thực tế

Registry pattern là Factory Method idiom của Spring. Định nghĩa interface với discriminator method (`getRegion()`), để Spring thu thập tất cả implementation, build map. Strategy mới không cần thay đổi code hiện có.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Open/Closed Principle là gì và Factory Method hỗ trợ thế nào?</b></summary>

OCP khuyên code nên mở rộng dễ dàng nhưng đóng với việc sửa đổi. Factory Method hỗ trợ bằng cách cho phép ta thêm các class sản phẩm mới và các class factory con tương ứng để tạo chúng mà không cần chỉnh sửa code của các factory hay client hiện có.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa Factory Method và Simple Factory?</b></summary>

Simple Factory chỉ là một class bình thường chứa cấu trúc if-else để tạo đối tượng dựa trên tham số truyền vào. Factory Method sử dụng tính đa hình và kế thừa, trì hoãn việc quyết định tạo class con nào cho các Factory Class con tự triển khai.
</details>

<details>
<summary><b>Q: Đặt tên một ví dụ Factory Method trong Spring hoặc JDK.</b></summary>

Calendar.getInstance() trong JDK hoặc LoggerFactory.getLogger() của SLF4J.
</details>
