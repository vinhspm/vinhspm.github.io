# Creational Patterns

**Breadcrumb:** 10. Design Patterns

> Creational pattern trừu tượng hóa và kiểm soát việc tạo object — Singleton, Factory Method, Builder, Prototype — tách client khỏi class cụ thể.

## Các điểm chính

- ✦ **Singleton**: một instance mỗi JVM. Spring singleton scope.
- ✦ **Factory Method**: subclass/implementation quyết định class nào được khởi tạo.
- ✦ **Builder**: xây dựng object phức tạp từng bước. Kết quả bất biến.
- ✦ **Prototype**: clone object có sẵn thay vì xây từ đầu.

*4 Creational Patterns: Singleton / Factory Method / Builder / Prototype trong Order domain*
```java
// ── SINGLETON: one instance per JVM / Spring context ────────────────────────
// Spring way (preferred — testable via DI)
@Component public class OrderIdGenerator {
    private final AtomicLong counter = new AtomicLong(0);
    public String next() { return "ORD-" + counter.incrementAndGet(); }
}
// Manual (enum — simplest thread-safe singleton in Java)
enum AppConfig { INSTANCE;
    private final String region = System.getenv("AWS_REGION");
    public String region() { return region; }
}

// ── FACTORY METHOD: caller depends on interface, not concrete type ─────────
interface PaymentProcessor { String region(); PaymentResult charge(ChargeRequest req); }
@Component class StripeProcessor implements PaymentProcessor {
    public String region() { return "US"; }
    public PaymentResult charge(ChargeRequest req) { /* Stripe API call */ return new PaymentResult("stripe"); }
}
@Component class VNPayProcessor implements PaymentProcessor {
    public String region() { return "VN"; }
    public PaymentResult charge(ChargeRequest req) { /* VNPay API call */ return new PaymentResult("vnpay"); }
}
@Component class PaymentProcessorFactory {
    private final Map<String, PaymentProcessor> registry;
    PaymentProcessorFactory(List<PaymentProcessor> processors) {
        registry = processors.stream().collect(toMap(PaymentProcessor::region, p -> p));
    }
    public PaymentProcessor get(String region) { return registry.get(region); }
}

// ── BUILDER: fluent construction with validation ───────────────────────────
@Builder @Value public class Order {
    String userId;
    @Builder.Default List<OrderItem> items = new ArrayList<>();
    @Builder.Default String currency = "USD";
    @Builder.Default OrderStatus status = OrderStatus.PENDING;
}
Order o = Order.builder().userId("u1").currency("VND")
               .items(List.of(new OrderItem("p1", 2, new BigDecimal("50")))).build();

// ── PROTOTYPE: clone template instead of constructing from scratch ─────────
public class DocumentTemplate {
    private String title;
    private List<Section> sections;
    // Copy constructor — deep clone
    public DocumentTemplate(DocumentTemplate src) {
        this.title    = src.title;
        this.sections = src.sections.stream().map(Section::copy).toList();
    }
    public DocumentTemplate clone() { return new DocumentTemplate(this); }
}
DocumentTemplate invoice = invoiceTemplate.clone(); // reuse structure, change data
```

### 💡 Lời khuyên thực tế

Dùng Lombok @Builder cho DTO/request nhiều field. Dùng Factory Method khi khởi tạo có conditional logic phức tạp làm ô nhiễm caller.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Khi nào dùng Builder thay vì constructor?</b></summary>

Khi đối tượng có quá nhiều trường (ví dụ > 4 trường), nhiều trường tùy chọn (optional) hoặc khi đối tượng yêu cầu quá trình khởi tạo phức tạp từng bước.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa Factory Method và Abstract Factory?</b></summary>

Factory Method là một phương thức đơn lẻ để tạo ra một loại đối tượng cụ thể thông qua kế thừa. Abstract Factory là một Interface chứa nhiều Factory Method để tạo ra một họ các đối tượng liên quan với nhau mà không cần chỉ ra class cụ thể.
</details>

<details>
<summary><b>Q: Spring quản lý Singleton bean thế nào?</b></summary>

Spring sử dụng một bộ đăng ký (Singleton Registry) nội bộ (bản chất là một ConcurrentHashMap) để lưu giữ và trả về duy nhất một instance của bean ứng với mỗi ID/Class trong suốt vòng đời của ApplicationContext (khác với Singleton cổ điển ở mức ClassLoader).
</details>
