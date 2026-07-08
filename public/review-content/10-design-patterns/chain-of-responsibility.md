# Chain of Responsibility

**Breadcrumb:** 10. Design Patterns › Behavioral

> Chain of Responsibility truyền request qua handler chain; mỗi handler xử lý nó hoặc chuyển cho cái tiếp theo — tách sender khỏi receiver và cho phép cấu thành chain động.

## Các điểm chính

- ✦ Mỗi handler: <code>handle(req)</code> — xử lý nếu applicable, delegate sang <code>next</code> nếu không.
- ✦ Chain cấu hình bên ngoài — handler không biết về nhau.
- ✦ Spring Security filter chain là ví dụ điển hình: mỗi filter xử lý concern của nó và pass on.
- ✦ Lợi ích: thêm/xóa/sắp xếp lại handler không cần thay đổi sender hoặc handler khác.

*OrderValidationChain: StockValidator → FraudValidator → PaymentValidator — extensible pipeline*
```java
// ── Validator interface: each handler validates one concern ──────────────────
public interface OrderValidator {
    ValidationResult validate(Order order);
    void setNext(OrderValidator next);     // chain link
}

// ── Abstract base: handle chaining boilerplate ────────────────────────────────
public abstract class AbstractOrderValidator implements OrderValidator {
    private OrderValidator next;

    @Override
    public void setNext(OrderValidator next) { this.next = next; }

    // Template: validate self, then pass to next if valid
    protected ValidationResult passOrStop(Order order, ValidationResult myResult) {
        if (!myResult.isValid()) return myResult;                     // stop chain on failure
        return next != null ? next.validate(order) : myResult;        // continue if next exists
    }
}

// ── Handler 1: Stock Validator ────────────────────────────────────────────────
@Component
public class StockValidator extends AbstractOrderValidator {
    private final InventoryService inventoryService;

    @Override
    public ValidationResult validate(Order order) {
        for (OrderItem item : order.getItems()) {
            int available = inventoryService.getAvailableStock(item.getProductId());
            if (available < item.getQuantity()) {
                return ValidationResult.fail(
                    "Insufficient stock for product " + item.getProductId() +
                    ": requested " + item.getQuantity() + ", available " + available);
            }
        }
        return passOrStop(order, ValidationResult.ok());
    }
}

// ── Handler 2: Fraud Validator ────────────────────────────────────────────────
@Component
public class FraudValidator extends AbstractOrderValidator {
    private final FraudDetectionService fraudService;

    @Override
    public ValidationResult validate(Order order) {
        FraudScore score = fraudService.evaluate(order.getUserId(), order.getTotal(),
                                                  order.getShippingAddress());
        if (score.getRisk() == RiskLevel.HIGH) {
            return ValidationResult.fail("Order flagged as high fraud risk: score=" + score.getScore());
        }
        if (score.getRisk() == RiskLevel.MEDIUM) {
            // Allow but flag for manual review
            order.setFlag("FRAUD_REVIEW");
        }
        return passOrStop(order, ValidationResult.ok());
    }
}

// ── Handler 3: Payment Validator ──────────────────────────────────────────────
@Component
public class PaymentValidator extends AbstractOrderValidator {
    private final UserService userService;

    @Override
    public ValidationResult validate(Order order) {
        User user = userService.findById(order.getUserId());
        if (!user.hasValidPaymentMethod()) {
            return ValidationResult.fail("No valid payment method on file for user " + order.getUserId());
        }
        if (order.getTotal().compareTo(user.getCreditLimit()) > 0) {
            return ValidationResult.fail("Order total exceeds credit limit: " +
                order.getTotal() + " > " + user.getCreditLimit());
        }
        return passOrStop(order, ValidationResult.ok());
    }
}

// ── Chain builder: assemble the validation pipeline ───────────────────────────
@Service
public class OrderValidationChain {
    private final OrderValidator chain;

    public OrderValidationChain(StockValidator stock,
                                 FraudValidator  fraud,
                                 PaymentValidator payment) {
        // Build chain: Stock → Fraud → Payment
        stock.setNext(fraud);
        fraud.setNext(payment);
        this.chain = stock;   // entry point
    }

    public ValidationResult validate(Order order) {
        return chain.validate(order);    // starts at Stock, passes through each
    }
}

// ── Usage in OrderService ─────────────────────────────────────────────────────
@Service
public class OrderService {
    private final OrderValidationChain validationChain;

    @Transactional
    public Order placeOrder(OrderRequest req) {
        Order order = Order.from(req);
        ValidationResult result = validationChain.validate(order);
        if (!result.isValid()) {
            throw new OrderValidationException(result.getMessage());
        }
        return orderRepo.save(order);
    }
}

// Adding a new validator (e.g., AgeVerificationValidator for age-restricted products):
// @Component class AgeVerificationValidator extends AbstractOrderValidator { ... }
// → Inject into OrderValidationChain and add: payment.setNext(ageVerification)
```

### 💡 Lời khuyên thực tế

Spring Security filter chain: SecurityFilterChain là Chain of Responsibility theo nghĩa đen — thêm filter cho JWT validation, CORS, rate limiting không cần thay đổi filter khác. Dùng Chain of Responsibility cho validation pipeline khi các validator khác nhau áp dụng cho input khác nhau.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa Chain of Responsibility và if-else chain?</b></summary>

If-else chain xử lý tập trung, cứng nhắc và khó tái sử dụng. Chain of Responsibility phân rã mỗi nhánh xử lý thành một class Handler độc lập, cho phép linh hoạt thay đổi thứ tự, thêm hoặc bớt handler trong chuỗi khi chạy (runtime).
</details>

<details>
<summary><b>Q: Spring Security implement Chain of Responsibility thế nào?</b></summary>

Thông qua SecurityFilterChain: request HTTP sẽ đi qua một danh sách các filter xếp tuần tự (như check csrf, auth, logout). Mỗi filter xử lý nhiệm vụ của mình và quyết định có gọi tiếp `filterChain.doFilter(...)` để chuyển request cho filter tiếp theo hay không.
</details>

<details>
<summary><b>Q: Handler trong chain có thể vừa xử lý VÀ forward request không?</b></summary>

Có, hoàn toàn được. Đó là cơ chế hoạt động điển hình của các Filter: thực hiện xử lý ghi log hoặc kiểm tra quyền (xử lý), sau đó tiếp tục forward request đi tiếp xuống dưới.
</details>
