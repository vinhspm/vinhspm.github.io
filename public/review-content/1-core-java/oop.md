# Lập Trình Hướng Đối Tượng (OOP)

**Breadcrumb:** 1. Core Java

> OOP tổ chức code xoay quanh bốn trụ cột — **Encapsulation, Inheritance, Polymorphism, Abstraction** — giúp xây dựng hệ thống modular, tái sử dụng và dễ bảo trì.

## Các điểm chính

- ✦ Encapsulation: gom dữ liệu và hành vi lại, che giấu nội bộ sau một public API rõ ràng.
- ✦ Inheritance: subclass kế thừa và tái sử dụng parent class qua <code>extends</code>; Java chỉ hỗ trợ đơn kế thừa class.
- ✦ Polymorphism: cùng một tham chiếu, hành vi khác nhau lúc runtime — method dispatch được giải quyết tại runtime.
- ✦ Abstraction: chỉ lộ *cái gì* chứ không lộ *làm thế nào*; dùng interface hoặc abstract class.
- ✦ Ưu tiên **composition thay vì inheritance** để tránh tight coupling và vấn đề fragile base-class.

*OOP: Template Method + Polymorphism trong Order processing*
```java
import java.util.Objects;

// Abstraction: callers invoke process(), not the internal steps
public abstract class OrderProcessor {
    private final String processorId;
    private ProcessorStatus status = ProcessorStatus.IDLE;

    protected OrderProcessor(String processorId) {
        this.processorId = Objects.requireNonNull(processorId, "processorId required");
    }

    // Template Method — defines the skeleton; subclasses fill in the blanks
    public final ProcessingResult process(Order order) {
        validateOrder(order);                    // hook — subclass defines HOW
        ProcessingResult result = executeProcessing(order);
        this.status = result.isSuccess()
            ? ProcessorStatus.DONE : ProcessorStatus.FAILED;
        return result;
    }

    protected abstract void validateOrder(Order order);
    protected abstract ProcessingResult executeProcessing(Order order);

    // Encapsulation: controlled read-only access to internal state
    public ProcessorStatus getStatus() { return status; }
    public String getProcessorId()     { return processorId; }
}

// Inheritance + Polymorphism: concrete subclass fills in the contract
public class DigitalOrderProcessor extends OrderProcessor {
    private final EmailService emailService;

    public DigitalOrderProcessor(EmailService emailService) {
        super("digital-processor");
        this.emailService = Objects.requireNonNull(emailService);
    }

    @Override
    protected void validateOrder(Order order) {
        if (order.getItems().isEmpty())
            throw new IllegalArgumentException("Order must have at least one item");
    }

    @Override
    protected ProcessingResult executeProcessing(Order order) {
        emailService.sendDownloadLink(order.getCustomerEmail(), order.getItems());
        return ProcessingResult.success(order.getId());
    }
}

// --- Usage: caller works with the abstract type (Polymorphism) ---
OrderProcessor processor = new DigitalOrderProcessor(emailService);
ProcessingResult result = processor.process(order); // dispatched to DigitalOrderProcessor at runtime
```

### 💡 Lời khuyên thực tế

Trong phỏng vấn, hãy liên kết OOP với Spring: các class `@Service` là các implementation của interface; Spring inject đúng implementation (polymorphism + DI). Đề cập SOLID principles — chúng mở rộng tư tưởng OOP thành hướng dẫn kiến trúc.

### ❓ Câu hỏi phỏng vấn

- **Q:** Giải thích bốn trụ cột OOP kèm ví dụ từ codebase của bạn.
- **Q:** Khi nào bạn chọn composition thay vì inheritance?
- **Q:** Overloading và overriding khác nhau thế nào?
- **Q:** Java đạt được runtime polymorphism bằng cách nào?
