# Behavioral Patterns

**Breadcrumb:** 10. Design Patterns

> Behavioral pattern định nghĩa giao tiếp và phân phối trách nhiệm giữa object — Strategy, Observer, Template Method, Command, Chain of Responsibility.

## Các điểm chính

- ✦ **Strategy**: encapsulate thuật toán có thể thay thế. Thay thế if/switch.
- ✦ **Observer**: event notification one-to-many. Spring ApplicationEvent.
- ✦ **Template Method**: skeleton thuật toán trong base class, step biến đổi trong subclass.
- ✦ **Command**: encapsulate request như object — cho phép undo/queue.
- ✦ **Chain of Responsibility**: truyền request qua handler chain. Spring Security filter.

*5 Behavioral Patterns: Strategy/Observer/Template Method/Command/Chain — quick reference*
```java
// ── STRATEGY: encapsulate interchangeable algorithm ─────────────────────────
interface PricingStrategy { String customerType(); BigDecimal calculate(BigDecimal base); }
@Component class VipPricing    implements PricingStrategy {
    public String customerType(){ return "VIP"; }
    public BigDecimal calculate(BigDecimal p){ return p.multiply(new BigDecimal("0.80")); } // 20% off
}
@Component class FlashSalePricing implements PricingStrategy {
    public String customerType(){ return "FLASH"; }
    public BigDecimal calculate(BigDecimal p){ return p.multiply(new BigDecimal("0.50")); } // 50% off
}
@Service class PricingService {       // registry: Spring injects all implementations
    private final Map<String,PricingStrategy> registry;
    PricingService(List<PricingStrategy> strategies){
        registry = strategies.stream().collect(toMap(PricingStrategy::customerType, s->s));
    }
    public BigDecimal price(String type, BigDecimal base){
        return registry.getOrDefault(type, p -> p).calculate(base);
    }
}

// ── OBSERVER: event notification, decoupled one-to-many ─────────────────────
// Publisher knows nothing about subscribers
@Service class OrderService {
    @Autowired ApplicationEventPublisher pub;
    @Transactional public Order placeOrder(OrderRequest req){
        Order o = repo.save(new Order(req));
        pub.publishEvent(new OrderPlacedEvent(o.getId(), o.getUserId(), o.getTotal()));
        return o;
    }
}
@Component class EmailObserver {
    @EventListener @Async void on(OrderPlacedEvent e){ emailSvc.sendConfirmation(e.userId()); }
}
@Component class InventoryObserver {
    @EventListener void on(OrderPlacedEvent e){ inventorySvc.reserve(e.orderId()); }
}

// ── TEMPLATE METHOD: fixed algorithm structure, variable steps ────────────────
abstract class ReportGenerator {
    public final byte[] generate(ReportParams p){         // final: algorithm fixed
        List<?> data = fetchData(p);                      // step 1 — abstract
        List<?> processed = processData(data);            // step 2 — abstract
        beforeRender(processed);                          // hook — optional
        return render(processed);                         // step 3 — abstract
    }
    protected abstract List<?> fetchData(ReportParams p);
    protected abstract List<?> processData(List<?> raw);
    protected abstract byte[] render(List<?> data);
    protected void beforeRender(List<?> data) {}          // default no-op hook
}

// ── COMMAND: encapsulate request as object, enable undo ──────────────────────
interface OrderCommand { void execute(); void undo(); }
class PlaceOrderCommand implements OrderCommand {
    private Order placed;
    public void execute(){ placed = orderService.placeOrder(req); }
    public void undo()   { orderService.cancelOrder(placed.getId()); }
}
class CommandHistory {
    private final Deque<OrderCommand> history = new ArrayDeque<>();
    public void run(OrderCommand cmd){ cmd.execute(); history.push(cmd); }
    public void undo(){ if(!history.isEmpty()) history.pop().undo(); }
}

// ── CHAIN OF RESPONSIBILITY: pass request through handler chain ───────────────
interface OrderValidator { boolean validate(Order order, OrderValidator next); }
// Spring Security filter chain: same pattern — each filter handles its concern or passes on
// AuthenticationFilter → AuthorizationFilter → CorsFilter → ... → DispatcherServlet
```

### 💡 Lời khuyên thực tế

Strategy là pattern áp dụng nhiều nhất cho biến đổi business logic. Chain of Responsibility có mặt khắp nơi trong Spring (filter chain, interceptor). Observer cung cấp năng lượng cho event system của Spring.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Strategy khác if-else thế nào?</b></summary>

If-else cứng nhắc và khó mở rộng (vi phạm Open/Closed). Strategy bao bọc các nhánh điều kiện thành các class chiến lược độc lập kế thừa chung một interface, cho phép dễ dàng thêm chiến lược mới mà không cần sửa đổi code gọi gốc.
</details>

<details>
<summary><b>Q: Chain of Responsibility được dùng ở đâu trong Spring?</b></summary>

Dùng phổ biến trong hệ thống lọc của Spring Security (`FilterChain` bao gồm chuỗi các Filter kiểm tra request nối tiếp nhau) và cơ chế HandlerInterceptor trong Spring MVC.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa Observer và pub/sub messaging?</b></summary>

Observer là giao tiếp đồng bộ trực tiếp (Subject giữ danh sách tham chiếu các Observer để gọi hàm). Pub/Sub là bất đồng bộ hoàn toàn và lỏng lẻo (decoupled) thông qua một kênh trung gian (Event Broker/Message Queue), người gửi và người nhận không hề biết nhau.
</details>
