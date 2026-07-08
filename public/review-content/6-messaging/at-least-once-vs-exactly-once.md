# At-Least-Once vs Exactly-Once

**Breadcrumb:** 6. Messaging › Common Concepts

> Delivery semantic xác định bao nhiêu lần message có thể được giao — at-most-once (có thể mất), at-least-once (có thể trùng), exactly-once (không cái nào) — mỗi loại có trade-off khác nhau.

## Các điểm chính

- ✦ **At-most-once**: commit offset trước xử lý. Message có thể mất nếu crash sau commit nhưng trước xử lý.
- ✦ **At-least-once**: commit offset sau xử lý. Message có thể được xử lý lại nếu crash sau xử lý nhưng trước commit. Phổ biến nhất.
- ✦ **Exactly-once**: khó đạt nhất. Cần idempotent producer + transactional API + consumer isolation.
- ✦ Kafka EOS: <code>enable.idempotence=true</code> + <code>transactional.id</code> + consumer <code>isolation.level=read_committed</code>.
- ✦ Thực tế: at-least-once + idempotent consumer đơn giản hơn và đủ cho hầu hết trường hợp.

*At-most-once vs at-least-once vs exactly-once: config + tradeoffs + khi nào dùng EOS*
```java
// At-most-once: commit offset BEFORE processing (can lose messages)
// spring.kafka.listener.ack-mode: record  (auto-commit immediately)
// Risk: crash after commit but before processing → message lost forever

// At-least-once: commit offset AFTER processing (can re-process messages)
@KafkaListener(topics = "order-events", groupId = "order-service")
public void processAtLeastOnce(OrderCreatedEvent event, Acknowledgment ack) {
    orderService.process(event); // process first
    ack.acknowledge();           // then commit → at-least-once delivery
    // If crash between process() and ack() → message redelivered → consumer must be IDEMPOTENT
}

// Exactly-once: Kafka transactional API (read-process-publish as one atomic unit)
// Step 1: Producer config
// spring.kafka.producer.transactional-id: order-service-tx-${instance.id}
// spring.kafka.producer.enable-idempotence: true
// spring.kafka.producer.acks: all

// Step 2: Consume-Transform-Publish in one Kafka transaction
@KafkaListener(topics = "order-events", groupId = "fulfillment-service")
public void processExactlyOnce(OrderCreatedEvent event) {
    kafkaTemplate.executeInTransaction(ops -> {
        // Read "order-events", process, publish to "fulfillment-events"
        // If anything fails → entire transaction aborts → no duplicate output
        FulfillmentEvent fulfillment = fulfillmentService.prepare(event);
        ops.send("fulfillment-events", event.getOrderId(), fulfillment);
        return null;
    });
}
// Step 3: Consumer must set isolation.level=read_committed to skip aborted txn
// spring.kafka.consumer.properties.isolation.level: read_committed

// Practical recommendation:
// Use at-least-once + idempotent consumer for 99% of cases
// Exactly-once adds complexity: transactional-id must be unique per instance,
// throughput drops ~20%, and cross-system transactions (Kafka→DB) still need Outbox pattern
```

### 💡 Lời khuyên thực tế

Với hầu hết ứng dụng: dùng at-least-once + idempotent consumer (đơn giản hơn, đủ dùng). Chỉ implement Kafka EOS đầy đủ khi: mất dữ liệu không chấp nhận được VÀ không thể làm consumer idempotent VÀ throughput cho phép overhead.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa at-least-once và exactly-once delivery là gì?</b></summary>

At-least-once đảm bảo tin nhắn được gửi đi ít nhất một lần (có thể bị trùng lặp do gửi lại khi timeout). Exactly-once đảm bảo tin nhắn được xử lý chính xác một lần duy nhất nhờ cơ chế loại bỏ trùng lặp (deduplication) và transaction.
</details>

<details>
<summary><b>Q: Kafka đạt exactly-once semantics thế nào?</b></summary>

Kết hợp 3 cơ chế: Idempotent Producer (gắn chuỗi tuần tự Sequence ID cho tin nhắn), Transactional API (cho phép viết ghi đa partition/topic mang tính nguyên tử), và Consumer tracking offset trong transaction.
</details>

<details>
<summary><b>Q: Tại sao at-least-once + idempotency là lựa chọn thực tế phổ biến nhất?</b></summary>

Vì dễ thiết lập, chịu lỗi tốt, hiệu năng cao và ít tốn tài nguyên hệ thống hơn rất nhiều so với việc duy trì transaction hai pha (exactly-once) phức tạp trên toàn bộ các service.
</details>
