# Choreography Saga

**Breadcrumb:** 5. Microservices › Saga Pattern

> Trong choreography, mỗi service lắng nghe event và quyết định hành động của mình độc lập — không có coordinator trung tâm, cho phép loose coupling nhưng khó visualize flow.

## Các điểm chính

- ✦ Service giao tiếp qua event (Kafka, RabbitMQ). Không service nào biết toàn bộ flow.
- ✦ Mỗi service phản ứng với event đến, làm việc cục bộ, publish event mới.
- ✦ **Ưu**: hoàn toàn decoupled, không có single point of failure, dễ thêm participant mới.
- ✦ **Nhược**: khó trace toàn bộ saga flow, nguy cơ cyclic event chain, khó xử lý partial failure duyên dáng.
- ✦ Debug: distributed tracing (Zipkin/Jaeger) thiết yếu để correlate event.

*Choreography: full forward + compensation event flow, PaymentHandler (idempotency + local tx + publish), ShippingHandler, correlation ID tracing*
```java
// ✅ Choreography Saga: event-driven, no central coordinator
// Each service reacts to events and publishes new events — decoupled, but harder to trace

// ── Full event flow for "Place Order" saga ──
// Forward path:
//  order-service  ──[order.created]──► inventory-service
//  inventory-service ──[stock.reserved]──► payment-service
//  payment-service ──[payment.completed]──► shipping-service
//  shipping-service ──[shipping.scheduled]──► order-service (mark COMPLETED)
//
// Compensation path (if payment fails):
//  payment-service ──[payment.failed]──► inventory-service (release reservation)
//                                    ──► order-service      (cancel order)

// ✅ PaymentService: reacts to stock.reserved, publishes payment result
@Service
public class PaymentChoreographyHandler {
    @Autowired KafkaTemplate<String, Object> kafka;
    @Autowired PaymentGateway paymentGateway;

    @KafkaListener(topics = "stock.reserved", groupId = "payment-service")
    @Transactional
    public void onStockReserved(StockReservedEvent event, Acknowledgment ack) {
        try {
            // Idempotency check: avoid double-charge if message delivered twice
            if (paymentRepository.existsByOrderId(event.getOrderId())) {
                log.warn("Duplicate payment event for orderId={}, skipping", event.getOrderId());
                ack.acknowledge();
                return;
            }
            // Local transaction: charge + save payment record
            PaymentResult result = paymentGateway.charge(
                event.getCustomerId(), event.getTotal(), event.getOrderId()
            );
            paymentRepository.save(new Payment(event.getOrderId(), result.getTransactionId(), PaymentStatus.COMPLETED));

            // Forward: trigger shipping
            kafka.send("payment.completed",
                new PaymentCompletedEvent(event.getOrderId(), result.getTransactionId()));
            ack.acknowledge();  // commit Kafka offset only after local tx + publish succeed
        } catch (PaymentDeclinedException e) {
            kafka.send("payment.failed",
                new PaymentFailedEvent(event.getOrderId(), "Card declined: " + e.getMessage()));
            ack.acknowledge();
        }
    }
}

// ✅ ShippingService: reacts to payment.completed — final saga step
@Service
public class ShippingChoreographyHandler {
    @KafkaListener(topics = "payment.completed", groupId = "shipping-service")
    @Transactional
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        Shipment shipment = shippingService.scheduleDelivery(event.getOrderId());
        kafka.send("shipping.scheduled",
            new ShippingScheduledEvent(event.getOrderId(), shipment.getTrackingNumber()));
    }
}

// ✅ Distributed tracing: MUST propagate correlation ID through all events
// Add to every event DTO:
//   private String correlationId;   // same across all steps of one saga
// In each listener: MDC.put("correlationId", event.getCorrelationId());
// → Zipkin/Jaeger shows full saga trace across services
```

### 💡 Lời khuyên thực tế

Dùng choreography cho flow đơn giản 2-3 bước. Khi độ phức tạp tăng (compensation không còn rõ ràng), chuyển sang orchestration nơi flow explicit. Luôn dùng correlation ID trong event để trace saga qua các service.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Nhược điểm của choreography trong saga dài là gì?</b></summary>

Dễ dẫn đến hiện tượng "Spaghetti code" ở mức hệ thống do không có nơi quản lý tập trung luồng nghiệp vụ. Khi số bước tăng lên, hệ thống cực kỳ khó theo dõi (flow visibility), khó bảo trì, và có nguy cơ xảy ra vòng lặp vô hạn giữa các event (event loop).
</details>

<details>
<summary><b>Q: Làm thế nào để debug choreography saga khi bước nào đó fail âm thầm?</b></summary>

Sử dụng giải pháp **Distributed Tracing** (như Jaeger, Zipkin, OpenTelemetry) kết hợp gắn một **Correlation ID** duy nhất xuyên suốt chuỗi event để lọc log tập trung từ các service liên quan, phát hiện điểm đứt gãy luồng sự kiện.
</details>

<details>
<summary><b>Q: Choreography xử lý out-of-order event thế nào?</b></summary>

Sử dụng cơ chế Idempotency ở tầng nhận tin để bỏ qua các event trùng lặp, kết hợp lưu trữ trạng thái tạm thời của nghiệp vụ ở database để chỉ xử lý event khi nó ở đúng trạng thái logic mong muốn, nếu event đến quá sớm thì đưa vào hàng đợi chờ hoặc từ chối xử lý.
</details>
