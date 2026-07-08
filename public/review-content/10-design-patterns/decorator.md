# Decorator Pattern

**Breadcrumb:** 10. Design Patterns › Structural

> Decorator thêm trách nhiệm vào object một cách động bằng cách bọc nó bằng decorator object cùng interface — cho phép stack hành vi linh hoạt không cần subclass.

## Các điểm chính

- ✦ Decorator implement cùng interface với component nó bọc.
- ✦ Có thể stack nhiều decorator: <code>new Logging(new Caching(new JdbcRepo()))</code>.
- ✦ Java I/O: <code>new BufferedReader(new FileReader("f.txt"))</code>.
- ✦ Spring: @Transactional, @Cacheable, @Async được áp dụng qua proxy decoration.

*LoggingOrderService + MetricsOrderService chain wrapping OrderServiceImpl*
```java
// ── OrderService interface — shared by all decorators ────────────────────────
interface OrderService {
    Order placeOrder(OrderRequest request);
    Order cancelOrder(Long orderId);
}

// ── Core implementation ────────────────────────────────────────────────────
@Service
class OrderServiceImpl implements OrderService {
    private final OrderRepository repo;
    private final PaymentGateway  paymentGateway;
    OrderServiceImpl(OrderRepository repo, PaymentGateway pg) { this.repo = repo; this.paymentGateway = pg; }

    public Order placeOrder(OrderRequest req) {
        Order order = new Order(req);
        paymentGateway.charge(ChargeRequest.from(order));
        return repo.save(order);
    }
    public Order cancelOrder(Long orderId) {
        Order order = repo.findById(orderId).orElseThrow();
        order.cancel();
        return repo.save(order);
    }
}

// ── Decorator 1: Logging — wraps any OrderService ─────────────────────────
@Slf4j
class LoggingOrderService implements OrderService {
    private final OrderService delegate;
    LoggingOrderService(OrderService delegate) { this.delegate = delegate; }

    public Order placeOrder(OrderRequest req) {
        log.info("[ORDER] placeOrder start userId={} itemCount={}", req.getUserId(), req.getItemCount());
        long start = System.currentTimeMillis();
        try {
            Order result = delegate.placeOrder(req);
            log.info("[ORDER] placeOrder success orderId={} total={} ms={}",
                result.getId(), result.getTotal(), System.currentTimeMillis() - start);
            return result;
        } catch (Exception e) {
            log.error("[ORDER] placeOrder failed userId={} error={}", req.getUserId(), e.getMessage());
            throw e;
        }
    }
    public Order cancelOrder(Long orderId) {
        log.info("[ORDER] cancelOrder orderId={}", orderId);
        Order result = delegate.cancelOrder(orderId);
        log.info("[ORDER] cancelOrder success status={}", result.getStatus());
        return result;
    }
}

// ── Decorator 2: Metrics — wraps LoggingOrderService ──────────────────────
class MetricsOrderService implements OrderService {
    private final OrderService delegate;
    private final MeterRegistry meterRegistry;
    MetricsOrderService(OrderService delegate, MeterRegistry registry) {
        this.delegate = delegate; this.meterRegistry = registry;
    }

    public Order placeOrder(OrderRequest req) {
        return meterRegistry.timer("order.place", "userId", req.getUserId())
            .record(() -> {                                  // wraps real call with timing
                Order order = delegate.placeOrder(req);
                meterRegistry.counter("order.placed", "status", order.getStatus().name()).increment();
                return order;
            });
    }
    public Order cancelOrder(Long orderId) {
        Order result = delegate.cancelOrder(orderId);
        meterRegistry.counter("order.cancelled").increment();
        return result;
    }
}

// ── Compose the chain: Metrics → Logging → Core ───────────────────────────
// Each decorator unaware of others — only knows OrderService interface
OrderService core     = new OrderServiceImpl(repo, paymentGateway);
OrderService logged   = new LoggingOrderService(core);      // core + logging
OrderService measured = new MetricsOrderService(logged, meterRegistry); // + metrics

// Client code uses the outermost decorator
measured.placeOrder(request);
// Execution: MetricsOrderService → LoggingOrderService → OrderServiceImpl

// ── Spring alternative: @Aspect for cross-cutting concerns ────────────────
// @Around("execution(* com.example.OrderService.placeOrder(..))")
// → same effect without manual wrapping; Spring auto-generates proxy
```

### 💡 Lời khuyên thực tế

Trong Spring, dùng AOP-based decoration (@Cacheable, @Transactional) thay vì manual wrapper. Manual decorator hữu ích khi AOP không khả dụng hoặc cần decorator trong context không có DI.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Decorator khác Proxy thế nào?</b></summary>

Decorator tập trung vào việc thêm tính năng/hành vi mới cho đối tượng một cách linh hoạt tại runtime. Proxy tập trung vào việc kiểm soát quyền truy cập (access control, lazy loading, logging) đến đối tượng gốc mà không làm thay đổi trực tiếp hành vi của nó.
</details>

<details>
<summary><b>Q: Khi nào dùng Decorator thay vì subclass?</b></summary>

Khi muốn thêm/bớt tính năng cho đối tượng một cách động tại runtime, hoặc khi kế thừa (subclassing) tạo ra quá nhiều class con không thể quản lý nổi (bùng nổ số lượng class).
</details>

<details>
<summary><b>Q: Java I/O stream dùng Decorator thế nào?</b></summary>

Sử dụng cơ chế bọc lớp nối tiếp nhau: Ví dụ `new BufferedReader(new FileReader("file.txt"))`. `BufferedReader` trang trí thêm bộ đệm (buffering) cho luồng đọc thô của `FileReader`.
</details>
