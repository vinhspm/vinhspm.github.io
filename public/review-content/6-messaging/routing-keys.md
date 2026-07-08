# Routing Key

**Breadcrumb:** 6. Messaging › RabbitMQ

> Routing key là chuỗi gắn vào message mà exchange dùng (cùng binding) để quyết định queue nào nhận message.

## Các điểm chính

- ✦ Định dạng: quy ước từ phân cách bằng dấu chấm: <code>order.created</code>, <code>payment.failed</code>.
- ✦ Direct exchange: routing key binding phải khớp chính xác routing key message.
- ✦ Topic exchange: binding pattern có thể dùng <code>*</code> (một từ) và <code>#</code> (không hoặc nhiều từ).
- ✦ Fanout exchange: routing key bị bỏ qua.
- ✦ Headers exchange: routing dựa trên message header, không phải routing key.

*Routing key taxonomy: domain.entity.action; wildcard patterns; multi-queue fan-out*
```java
// Routing key taxonomy: domain.entity.action
// Allows fine-grained subscriptions with topic exchange

// Routing key examples:
// order.created       → new order placed
// order.shipped       → shipment dispatched
// order.item.added    → item added to existing order
// payment.processed   → payment succeeded
// payment.failed      → payment declined
// user.registered     → new user signup

// Pattern matching on topic exchange:
// "order.*"    → order.created ✓  order.shipped ✓  order.item.added ✗ (3 words)
// "order.#"    → order.created ✓  order.shipped ✓  order.item.added ✓ (any depth)
// "#.failed"   → payment.failed ✓  order.failed ✓  any.thing.failed ✓
// "#"          → ALL events (audit log pattern)

// Subscribe to specific event types with annotation:
@RabbitListener(bindings = @QueueBinding(
    value   = @Queue("payment-failure-queue"),
    exchange = @Exchange(value = "app.exchange", type = ExchangeTypes.TOPIC),
    key     = "payment.failed"   // exact: only payment.failed events
))
public void onPaymentFailed(PaymentFailedEvent event) {
    orderService.handlePaymentFailure(event.getOrderId());
    refundService.initiateRefund(event.getOrderId(), event.getAmount());
}

// Subscribe to all order events (inventory service needs all lifecycle events):
@RabbitListener(bindings = @QueueBinding(
    value   = @Queue("inventory-order-queue"),
    exchange = @Exchange(value = "app.exchange", type = ExchangeTypes.TOPIC),
    key     = "order.#"    // wildcard: order.created, order.cancelled, order.returned, etc.
))
public void onAnyOrderEvent(OrderEvent event) {
    inventoryService.syncStock(event);
}

// One message → multiple queues if multiple bindings match:
// publish "order.created" → matches order.# (order-queue) AND # (audit-queue)
```

### 💡 Lời khuyên thực tế

Thiết kế taxonomy routing key từ đầu: pattern `domain.entity.action` hoạt động tốt. Điều này cho phép downstream service subscribe chính xác event chúng quan tâm với topic binding pattern.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa * và # trong topic routing key là gì?</b></summary>

Ký tự `*` đại diện cho chính xác 1 từ (word). Ký tự `#` đại diện cho 0 hoặc nhiều từ.
</details>

<details>
<summary><b>Q: Một message có thể được giao đến nhiều queue không?</b></summary>

Có, nếu message được gửi qua Fanout/Topic exchange và cấu hình binding khớp với nhiều queue cùng lúc.
</details>

<details>
<summary><b>Q: Routing key khác nhau thế nào giữa direct và topic exchange?</b></summary>

Direct so khớp chuỗi chính xác tuyệt đối (exact match). Topic so khớp chuỗi linh hoạt theo pattern phân tách bằng dấu chấm `.` kết hợp các ký tự đại diện `*` và `#`.
</details>
