# Giao Tiếp Service

**Breadcrumb:** 5. Microservices

> Microservice giao tiếp đồng bộ (REST, gRPC) hoặc bất đồng bộ (messaging) — chọn pattern đúng ảnh hưởng đến coupling, latency và resilience.

## Các điểm chính

- ✦ **Đồng bộ**: REST (HTTP/JSON), gRPC (HTTP/2 + Protobuf). Đơn giản, response ngay, nhưng caller phải chờ.
- ✦ **Bất đồng bộ**: Kafka, RabbitMQ, SQS. Decoupled, resilient, nhưng eventual consistency.
- ✦ Dùng sync cho: read hướng user, query API, cần response real-time.
- ✦ Dùng async cho: event, notification, workflow decoupled, ghi throughput cao.
- ✦ Service Mesh (Istio, Linkerd): xử lý retry, circuit breaking, mTLS ở cấp infrastructure.

*3 patterns: Feign REST (FallbackFactory), gRPC blocking stub, Kafka async event publishing*
```java
// ✅ Three communication patterns in microservices

// ─── Pattern 1: SYNCHRONOUS REST (Feign Client) ───
// Use for: user-facing queries needing immediate response (order details, product lookup)
@FeignClient(
    name = "inventory-service",
    url = "${services.inventory.url}",
    fallbackFactory = InventoryClientFallbackFactory.class
)
public interface InventoryClient {
    @GetMapping("/api/inventory/{productId}")
    StockResponse checkStock(@PathVariable Long productId);

    @PostMapping("/api/inventory/reserve")
    ReserveResponse reserve(@RequestBody ReserveRequest request);
}

// Fallback factory: different response per exception type
@Component
public class InventoryClientFallbackFactory implements FallbackFactory<InventoryClient> {
    public InventoryClient create(Throwable cause) {
        return new InventoryClient() {
            public StockResponse checkStock(Long productId) {
                log.warn("Inventory service unavailable for product {}", productId, cause);
                return StockResponse.unknown();  // show "availability unknown" to user
            }
            public ReserveResponse reserve(ReserveRequest request) {
                throw new InventoryServiceException("Cannot reserve stock — inventory service down");
            }
        };
    }
}

// ─── Pattern 2: SYNCHRONOUS gRPC ───
// Use for: internal service-to-service calls needing low latency + strong contract
// Protobuf contract defined in orders.proto:
// service OrderService {
//     rpc GetOrder(GetOrderRequest) returns (OrderResponse);
//     rpc StreamOrderUpdates(OrderId) returns (stream OrderUpdate);  // server streaming
// }
@GrpcClient("order-service")
private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

public OrderDto getOrderViaGrpc(Long orderId) {
    GetOrderRequest req = GetOrderRequest.newBuilder().setOrderId(orderId).build();
    OrderResponse resp = orderStub.getOrder(req);
    return new OrderDto(resp.getId(), resp.getStatus(), resp.getTotal());
}

// ─── Pattern 3: ASYNCHRONOUS Kafka event ───
// Use for: state changes that other services "react to" (no immediate response needed)
// Order placed → InventoryService reserves stock, PaymentService charges, NotificationService emails
@Service
public class OrderEventPublisher {
    @Autowired
    private KafkaTemplate<String, Object> kafka;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(), order.getCustomerId(), order.getItems(), order.getTotal()
        );
        // Key = orderId: ensures all events for same order go to same partition (ordering)
        kafka.send("order.created", String.valueOf(order.getId()), event)
             .addCallback(
                 result -> log.info("Published order.created for orderId={}", order.getId()),
                 failure -> log.error("Failed to publish order.created", failure)
             );
    }
}
```

### 💡 Lời khuyên thực tế

Dùng Feign + Circuit Breaker cho sync inter-service call. Publish event lên Kafka cho thay đổi state mà service khác quan tâm. Kết hợp này ("sync cho query, async cho command") là default thực dụng.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Khi nào bạn chọn gRPC thay vì REST cho inter-service communication?</b></summary>

Chọn gRPC khi giao tiếp giữa các service nội bộ yêu cầu hiệu năng cực cao, độ trễ thấp, lượng truyền tải dữ liệu lớn, hoặc khi hệ thống được viết bằng nhiều ngôn ngữ lập trình khác nhau cần chia sẻ chung một hợp đồng API (file `.proto`) chặt chẽ.
</details>

<details>
<summary><b>Q: Trade-off giữa giao tiếp đồng bộ và bất đồng bộ là gì?</b></summary>

Giao tiếp đồng bộ (HTTP/gRPC) đơn giản, lập trình trực quan nhưng dễ gây ra lỗi dây chuyền (cascading failure), nghẽn luồng và tính phụ thuộc cao. Giao tiếp bất đồng bộ (Message Queue/Event) giúp cô lập lỗi tốt, tăng tính chịu tải và giảm phụ thuộc nhưng hệ thống phức tạp hơn, khó debug và chỉ đạt tính nhất quán sau cùng.
</details>

<details>
<summary><b>Q: Làm thế nào để xử lý lỗi trong sync service-to-service call?</b></summary>

Áp dụng cơ chế **Circuit Breaker** để ngắt kết nối sớm nếu đầu bên kia bị lỗi, thiết lập **Timeout** hợp lý để tránh treo luồng vô thời hạn, và chuẩn bị sẵn các hàm **Fallback** để trả về dữ liệu dự phòng an toàn.
</details>
