# Dependency Injection

**Breadcrumb:** 3. Spring Ecosystem › Spring Core

> DI là hình thức cụ thể của IoC, nơi dependency được container cung cấp thay vì class tự tạo — cho phép loose coupling và testability.

## Các điểm chính

- ✦ **Constructor injection**: dependency bắt buộc; immutable; dễ test mà không cần Spring.
- ✦ **Setter injection**: dependency tùy chọn; có thể re-inject lúc runtime.
- ✦ **Field injection** (<code>@Autowired</code> trên field): tiện lợi nhưng che giấu dependency, phá vỡ immutability, khó test.
- ✦ Spring Boot: single constructor tự động autowired mà không cần annotation <code>@Autowired</code>.
- ✦ <code>@Qualifier("name")</code> hoặc <code>@Primary</code> để phân biệt khi có nhiều bean cùng type.

*Constructor injection (required), setter injection (optional), @Qualifier + @Primary disambiguation*
```java
import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.*;

// ---- 1. Constructor Injection (RECOMMENDED) ----
// Dependencies are explicit, field is final (immutable), no Spring needed for unit tests
@Service
public class OrderService {
    private final OrderRepository   orderRepository;
    private final PaymentGateway    paymentGateway;
    private final InventoryService  inventoryService;

    // Single constructor → @Autowired is implicit in Spring Boot (no annotation needed)
    public OrderService(OrderRepository orderRepository,
                        PaymentGateway paymentGateway,
                        InventoryService inventoryService) {
        this.orderRepository  = Objects.requireNonNull(orderRepository, "orderRepository must not be null");
        this.paymentGateway   = Objects.requireNonNull(paymentGateway,  "paymentGateway must not be null");
        this.inventoryService = Objects.requireNonNull(inventoryService, "inventoryService must not be null");
    }

    public Order placeOrder(CreateOrderRequest req) {
        inventoryService.reserve(req.getItems());       // check stock first
        Order order = orderRepository.save(Order.from(req));
        paymentGateway.charge(req.getPaymentMethod(), order.totalAmount());
        return order;
    }
    // Unit test: new OrderService(mockRepo, mockGateway, mockInventory) — no Spring needed!
}

// ---- 2. Setter Injection — for OPTIONAL dependencies ----
@Service
public class ProductService {
    private final ProductRepository productRepository;
    private NotificationService notificationService;  // optional — not always present

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Setter injection: dependency is optional; bean works without it
    @Autowired(required = false)
    public void setNotificationService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    public void updatePrice(String productId, BigDecimal newPrice) {
        productRepository.updatePrice(productId, newPrice);
        // Guard: notification is optional
        if (notificationService != null) {
            notificationService.notifyPriceChange(productId, newPrice);
        }
    }
}

// ---- 3. @Qualifier: disambiguate multiple beans of same type ----
public interface PaymentGateway {
    PaymentResult charge(PaymentMethod method, BigDecimal amount);
}

@Component("stripeGateway")
public class StripeGateway implements PaymentGateway { /* ... */ }

@Component("paypalGateway")
public class PayPalGateway implements PaymentGateway { /* ... */ }

// Inject specific implementation by qualifier name
@Service
public class CheckoutService {
    private final PaymentGateway paymentGateway;

    // @Qualifier selects the correct bean among multiple candidates
    public CheckoutService(@Qualifier("stripeGateway") PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
}

// Alternative: use @Primary to mark the default implementation
@Component @Primary
public class DefaultPaymentGateway implements PaymentGateway { /* used when no @Qualifier */ }
```

### 💡 Lời khuyên thực tế

Trong test, inject mock implementation qua constructor — không cần Spring test context. Điều này làm unit test nhanh (< 1ms startup). Dùng `@MockBean` trong integration test khi cần Spring context nhưng muốn thay một bean.

### ❓ Câu hỏi phỏng vấn

- **Q:** Ba loại DI trong Spring và trade-off của chúng là gì?
- **Q:** Tại sao field injection được coi là bad practice?
- **Q:** Spring xử lý circular dependency trong constructor injection như thế nào?
