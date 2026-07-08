# Saga Pattern

**Breadcrumb:** 5. Microservices

> Saga quản lý distributed transaction qua microservice bằng cách chia thành chuỗi local transaction, mỗi cái publish event hoặc command để trigger bước tiếp theo.

## Các điểm chính

- ✦ Vấn đề: không có ACID transaction đơn nào spanning nhiều service.
- ✦ Saga: mỗi service commit cục bộ và publish event; khi thất bại, compensating transaction hoàn tác các bước trước.
- ✦ **Choreography**: service phản ứng với event — decoupled nhưng khó theo dõi.
- ✦ **Orchestration**: saga orchestrator trung tâm điều phối — dễ monitor hơn, điểm kiểm soát duy nhất.
- ✦ Compensating transaction: ngược lại của hành động gốc (ví dụ: hoàn tiền sau khi giao hàng thất bại).

*Saga Pattern: happy path + compensation flow + OrderService initiator + InventoryService participant with both forward and compensating transactions*
```java
// ✅ Saga Pattern: managing distributed transactions without 2PC
// Problem: placing an order spans 3 services (Inventory, Payment, Shipping)
// No single DB transaction across services → use Saga: chain of local transactions + compensation

// ─── Happy path flow (Choreography via Kafka events) ───
// 1. OrderService:    CREATE order → publish "order.created"
// 2. InventoryService: reserve stock → publish "stock.reserved"  (or "stock.failed")
// 3. PaymentService:  charge card   → publish "payment.completed" (or "payment.failed")
// 4. ShippingService: schedule ship → publish "shipping.scheduled"
// 5. OrderService:    update status → COMPLETED

// ─── Compensation flow (if payment fails) ───
// 3. PaymentService:  publish "payment.failed"
// 2. InventoryService: listens to "payment.failed" → release reservation (compensating tx)
// 1. OrderService:    listens to "payment.failed" or "stock.failed" → cancel order

// ✅ OrderService: initiate saga
@Service
public class OrderSagaInitiator {
    @Autowired KafkaTemplate<String, Object> kafka;

    @Transactional
    public Order placeOrder(PlaceOrderRequest request) {
        // Local transaction: persist order in PENDING state
        Order order = new Order(request.getCustomerId(), request.getItems(), OrderStatus.PENDING);
        Order saved = orderRepository.save(order);

        // Publish saga start event — Outbox pattern recommended for reliability
        kafka.send("order.created", String.valueOf(saved.getId()),
            new OrderCreatedEvent(saved.getId(), saved.getCustomerId(),
                                  saved.getItems(), saved.getTotal()));
        return saved;
    }

    // Compensation: listen for failure events and cancel the order
    @KafkaListener(topics = {"stock.reservation.failed", "payment.failed"}, groupId = "order-service")
    @Transactional
    public void onSagaFailure(SagaFailureEvent event) {
        log.warn("Saga failed for orderId={}, reason={}", event.getOrderId(), event.getReason());
        orderRepository.updateStatus(event.getOrderId(), OrderStatus.CANCELLED);
        kafka.send("order.cancelled",
            new OrderCancelledEvent(event.getOrderId(), event.getReason()));
    }
}

// ✅ InventoryService: react to saga event, publish next or compensation
@Service
public class InventorySagaParticipant {
    @Autowired KafkaTemplate<String, Object> kafka;

    @KafkaListener(topics = "order.created", groupId = "inventory-service")
    @Transactional
    public void onOrderCreated(OrderCreatedEvent event) {
        try {
            // Local transaction: atomically check + reserve stock
            reservationService.reserveForOrder(event.getOrderId(), event.getItems());
            // Publish success → triggers next saga step (PaymentService)
            kafka.send("stock.reserved",
                new StockReservedEvent(event.getOrderId(), event.getCustomerId(), event.getTotal()));
        } catch (InsufficientStockException e) {
            // Publish failure → triggers compensation in OrderService
            kafka.send("stock.reservation.failed",
                new StockReservationFailedEvent(event.getOrderId(), e.getMessage()));
        }
    }

    // Compensation: release reservation when payment fails
    @KafkaListener(topics = "payment.failed", groupId = "inventory-service")
    @Transactional
    public void onPaymentFailed(PaymentFailedEvent event) {
        reservationService.releaseReservation(event.getOrderId());
        log.info("Released stock reservation for orderId={}", event.getOrderId());
    }
}
```

### 💡 Lời khuyên thực tế

Bắt đầu với choreography (đơn giản hơn), chuyển sang orchestration (Temporal, Axon, AWS Step Functions) khi saga phức tạp (5+ bước, nhiều compensation). Luôn làm mỗi bước idempotent — Kafka giao at-least-once.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Compensating transaction trong Saga là gì?</b></summary>

Là giao dịch bù (hoàn tác) được thiết kế để đảo ngược các tác động của một giao dịch đã thực hiện thành công trước đó (ví dụ: giao dịch bù của "trừ tiền tài khoản" là "cộng lại tiền vào tài khoản"), được chạy khi có một bước sau đó trong chuỗi Saga bị thất bại.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa choreography và orchestration saga là gì?</b></summary>

Choreography hoạt động theo mô hình phản ứng sự kiện (event-driven), các service tự lắng nghe event của nhau để chạy tiếp mà không có ai quản lý. Orchestration hoạt động theo mô hình điều phối tập trung, có một service (orchestrator) ra lệnh trực tiếp cho từng service chạy lần lượt.
</details>

<details>
<summary><b>Q: Làm thế nào để xử lý partial failure trong distributed saga?</b></summary>

Khi một bước trong Saga thất bại, hệ thống sẽ kích hoạt luồng hoàn tác (Backward Recovery) bằng cách chạy lần lượt các compensating transaction cho các bước đã thành công trước đó theo thứ tự ngược lại để đưa hệ thống về trạng thái nhất quán ban đầu. Hoặc sử dụng Forward Recovery (tự động retry bước lỗi liên tục nếu lỗi đó được xác định là tạm thời).
</details>
