# REST vs gRPC

**Breadcrumb:** 5. Microservices › Service Communication

> REST dùng HTTP/1.1 + JSON (dễ đọc, hỗ trợ rộng); gRPC dùng HTTP/2 + Protobuf (binary, strongly typed, nhanh hơn, hỗ trợ streaming).

## Các điểm chính

- ✦ REST: text-based JSON, dễ debug, công cụ phong phú, thân thiện browser.
- ✦ gRPC: binary Protobuf (payload nhỏ hơn 3-10×), HTTP/2 multiplexing, bi-directional streaming, contract strongly typed.
- ✦ Code generation gRPC: file proto → stub type-safe trong bất kỳ ngôn ngữ nào (Java, Go, Python).
- ✦ Streaming gRPC: server-streaming, client-streaming, bidirectional (ví dụ: update real-time).
- ✦ REST tốt hơn cho: public API, browser client. gRPC tốt hơn cho: microservice nội bộ, low-latency, high-throughput.

*REST vs gRPC comparison table + proto definition + gRPC server (unary + server-streaming) + gRPC client with deadline and error handling*
```java
// ✅ REST vs gRPC comparison:
// ┌────────────────────┬─────────────────────┬──────────────────────────────┐
// │ Property           │ REST (HTTP/1.1+JSON) │ gRPC (HTTP/2 + Protobuf)    │
// ├────────────────────┼─────────────────────┼──────────────────────────────┤
// │ Protocol           │ HTTP/1.1 text        │ HTTP/2 binary               │
// │ Payload format     │ JSON (human-readable)│ Protobuf (3-10× smaller)    │
// │ Contract           │ OpenAPI (optional)   │ .proto file (mandatory)     │
// │ Type safety        │ Runtime               │ Compile-time (code-gen)     │
// │ Streaming          │ SSE / WebSocket       │ Native bi-directional       │
// │ Browser support    │ Full                  │ Needs gRPC-Web proxy        │
// │ Tooling            │ Postman, curl, browser│ Grpcurl, Postman (limited) │
// └────────────────────┴─────────────────────┴──────────────────────────────┘

// ✅ gRPC: proto definition (orders.proto)
// syntax = "proto3";
// service OrderService {
//     rpc GetOrder(GetOrderRequest) returns (OrderResponse);
//     rpc StreamOrderUpdates(OrderId) returns (stream OrderEvent);  // server streaming
// }
// message GetOrderRequest { int64 order_id = 1; }
// message OrderResponse   { int64 id = 1; string status = 2; double total = 3; }
// message OrderEvent      { int64 order_id = 1; string event_type = 2; string timestamp = 3; }

// ✅ gRPC Server implementation (Spring Boot + grpc-spring-boot-starter)
@GrpcService
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {

    @Autowired
    private OrderRepository orderRepository;

    // Unary RPC: one request, one response
    @Override
    public void getOrder(GetOrderRequest req, StreamObserver<OrderResponse> observer) {
        try {
            Order order = orderRepository.findById(req.getOrderId())
                .orElseThrow(() -> new OrderNotFoundException(req.getOrderId()));
            OrderResponse response = OrderResponse.newBuilder()
                .setId(order.getId())
                .setStatus(order.getStatus().name())
                .setTotal(order.getTotal().doubleValue())
                .build();
            observer.onNext(response);
            observer.onCompleted();
        } catch (OrderNotFoundException e) {
            observer.onError(Status.NOT_FOUND
                .withDescription("Order " + req.getOrderId() + " not found")
                .asRuntimeException());
        }
    }

    // Server-streaming RPC: one request, multiple responses (real-time order updates)
    @Override
    public void streamOrderUpdates(OrderId req, StreamObserver<OrderEvent> observer) {
        orderEventBus.subscribe(req.getId(), event -> {
            observer.onNext(OrderEvent.newBuilder()
                .setOrderId(event.getOrderId())
                .setEventType(event.getType().name())
                .setTimestamp(event.getTimestamp().toString())
                .build());
        });
        // observer.onCompleted() called when order reaches terminal state
    }
}

// ✅ gRPC Client (calling from payment-service to order-service)
@GrpcClient("order-service")               // resolves via service discovery
private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

public void validateOrderForPayment(Long orderId) {
    GetOrderRequest req = GetOrderRequest.newBuilder().setOrderId(orderId).build();
    try {
        OrderResponse order = orderStub.withDeadlineAfter(2, TimeUnit.SECONDS).getOrder(req);
        if (!order.getStatus().equals("CONFIRMED")) {
            throw new InvalidOrderStateException("Order must be CONFIRMED before payment");
        }
    } catch (StatusRuntimeException e) {
        if (e.getStatus().getCode() == Status.Code.NOT_FOUND) {
            throw new OrderNotFoundException(orderId);
        }
        throw new OrderServiceException("gRPC call failed", e);
    }
}
```

### 💡 Lời khuyên thực tế

Cho inter-service call nội bộ trong môi trường microservice đa ngôn ngữ, gRPC hấp dẫn — Protobuf contract bắt API mismatch lúc compile time. Cho public API được dùng bởi browser và bên thứ ba, gắn với REST/OpenAPI.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Ưu điểm chính của gRPC so với REST là gì?</b></summary>

gRPC sử dụng **HTTP/2** (truyền tải dạng nhị phân, multiplexing nhiều request trên 1 kết nối, nén header) giúp tốc độ truyền tải cực nhanh và tiết kiệm tài nguyên. Đồng thời gRPC sử dụng **Protocol Buffers** thay vì JSON nên payload rất nhỏ gọn và tự động sinh code client/server từ file `.proto` một cách chặt chẽ.
</details>

<details>
<summary><b>Q: Protocol Buffers là gì và tại sao dùng với gRPC?</b></summary>

Protocol Buffers (Protobuf) là cơ chế tuần tự hóa dữ liệu (serialization) dạng nhị phân do Google phát triển. Nó được dùng với gRPC vì cho tốc độ mã hóa/giải mã cực nhanh, kích thước dữ liệu truyền đi siêu nhỏ so với JSON/XML và hỗ trợ định nghĩa kiểu dữ liệu tĩnh nghiêm ngặt.
</details>

<details>
<summary><b>Q: gRPC có thể dùng từ browser không?</b></summary>

Không thể gọi trực tiếp native gRPC từ browser do các trình duyệt hiện nay chưa hỗ trợ đầy đủ các tính năng HTTP/2 mức thấp (như kiểm soát frame trực tiếp). Để gọi được từ browser, bắt buộc phải dùng thư viện hỗ trợ như **gRPC-Web** thông qua một proxy trung gian (như Envoy) để dịch HTTP/1.1 sang HTTP/2 gRPC.
</details>
