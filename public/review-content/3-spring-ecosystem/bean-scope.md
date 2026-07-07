# Phạm Vi Bean (Bean Scope)

**Breadcrumb:** 3. Spring Ecosystem › Spring Core

> Bean scope xác định Spring tạo bao nhiêu instance và thời gian sống của chúng — singleton (mặc định), prototype, request, session và application scope.

## Các điểm chính

- ✦ **singleton**: một instance mỗi ApplicationContext. Mặc định. Thread-safety là trách nhiệm của bạn.
- ✦ **prototype**: instance mới mỗi lần được yêu cầu. Container không destroy.
- ✦ **request**: một mỗi HTTP request. Chỉ trong web context.
- ✦ **session**: một mỗi HTTP session. Tồn tại qua nhiều request của một người dùng.
- ✦ **application**: một mỗi ServletContext (như singleton nhưng web-scoped).
- ✦ Inject scope ngắn vào singleton: dùng <code>@Lookup</code> hoặc <code>ObjectProvider&lt;T&gt;</code>.

*Bean scopes: singleton (stateless), prototype via ObjectProvider, @RequestScope, @SessionScope với scoped proxy*
```java
import org.springframework.beans.factory.*;
import org.springframework.context.annotation.*;
import org.springframework.stereotype.*;
import org.springframework.web.context.annotation.*;

// ---- 1. SINGLETON (default) — one instance per ApplicationContext ----
// Thread-safety is YOUR responsibility; avoid mutable state in singleton fields
@Service // implicitly @Scope("singleton")
public class OrderPricingEngine {
    // OK: final, immutable after construction
    private final TaxRateService taxRateService;

    public OrderPricingEngine(TaxRateService taxRateService) {
        this.taxRateService = taxRateService;
    }

    // OK: stateless method — safe from multiple threads
    public BigDecimal calculateTotal(Order order) {
        BigDecimal tax = taxRateService.getTaxRate(order.getCountry());
        return order.subtotal().multiply(BigDecimal.ONE.add(tax));
    }
    // BAD: adding "private List<Order> processedOrders" would be shared across all threads!
}

// ---- 2. PROTOTYPE — new instance every time the bean is requested ----
// Use for stateful objects that should NOT be shared (e.g. report builders, command objects)
@Component
@Scope("prototype")
public class OrderReportBuilder {
    private final List<String> lines = new ArrayList<>();
    private String reportTitle;

    public OrderReportBuilder withTitle(String title) { this.reportTitle = title; return this; }
    public OrderReportBuilder addLine(String line)    { lines.add(line); return this; }
    public String build() {
        return reportTitle + "
" + String.join("
", lines);
    }
}

// ---- Injecting prototype into singleton — use ObjectProvider ----
@Service
public class ReportService {
    // Do NOT inject OrderReportBuilder directly — singleton would hold one shared instance
    private final ObjectProvider<OrderReportBuilder> reportBuilderProvider;

    public ReportService(ObjectProvider<OrderReportBuilder> reportBuilderProvider) {
        this.reportBuilderProvider = reportBuilderProvider;
    }

    public String generateOrderSummary(List<Order> orders) {
        // getObject() creates a FRESH prototype instance each call
        OrderReportBuilder builder = reportBuilderProvider.getObject()
            .withTitle("Order Summary — " + LocalDate.now());
        orders.forEach(o -> builder.addLine(o.getId() + " | " + o.totalAmount()));
        return builder.build();
    }
}

// ---- 3. REQUEST scope — new instance per HTTP request ----
// Holds request-specific state; automatically destroyed when request completes
@Component
@RequestScope  // shorthand for @Scope(value="request", proxyMode=ScopedProxyMode.TARGET_CLASS)
public class OrderRequestContext {
    private String currentUserId;
    private String correlationId;

    public void initialize(String userId, String correlationId) {
        this.currentUserId  = userId;
        this.correlationId  = correlationId;
    }
    public String getCurrentUserId() { return currentUserId; }
}

// ---- 4. SESSION scope — one instance per HTTP session ----
@Component
@SessionScope
public class ShoppingCart {
    private final List<CartItem> items = new ArrayList<>();

    public void addItem(Product product, int quantity) {
        items.add(new CartItem(product, quantity));
    }
    public List<CartItem> getItems() { return Collections.unmodifiableList(items); }
    public BigDecimal total() {
        return items.stream()
            .map(i -> i.getProduct().getPrice().multiply(new BigDecimal(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// Inject request/session-scoped bean into singleton via scoped proxy:
// Spring injects a proxy; at runtime the proxy delegates to the correct scope instance
@Service
public class CheckoutService {
    private final ShoppingCart shoppingCart; // proxy — Spring resolves per-session at runtime
    public CheckoutService(ShoppingCart shoppingCart) { this.shoppingCart = shoppingCart; }

    public Order checkout(String userId) {
        List<CartItem> items = shoppingCart.getItems();
        return orderService.createOrder(userId, items);
    }
}
```

### 💡 Lời khuyên thực tế

Bean singleton phải thread-safe. Nếu có mutable state phải là per-request (ví dụ: request-context object), dùng request scope hoặc ThreadLocal. Đừng bao giờ lưu state đặc thù request trong field singleton.

### ❓ Câu hỏi phỏng vấn

- **Q:** Bean scope mặc định trong Spring là gì?
- **Q:** Làm thế nào để inject bean prototype vào singleton?
- **Q:** Khi nào bạn dùng session scope?
