# Đảm Bảo Thứ Tự Kafka

**Breadcrumb:** 6. Messaging › Kafka

> Kafka đảm bảo thứ tự message chỉ trong một partition — đạt total order cần dùng single partition, trong khi partial order (mỗi entity) dùng keyed partitioning.

## Các điểm chính

- ✦ Trong một partition: message có thứ tự nghiêm ngặt (FIFO). Offset 5 luôn sau offset 4.
- ✦ Qua các partition: KHÔNG đảm bảo thứ tự.
- ✦ Sắp xếp tất cả message cho một entity (ví dụ: một đơn hàng): dùng entity ID làm partition key.
- ✦ Total global ordering: single partition (giới hạn throughput xuống một partition).
- ✦ Exactly-once semantics (EOS): enable.idempotence=true + transactional producer + consumer isolation.level=read_committed.

*Keyed ordering: entity ID làm key; EOS với transactional producer; isolation.level*
```java
// Ordering: guaranteed WITHIN a partition, NOT across partitions
// Strategy: use entity ID (orderId, userId) as message key → same key = same partition

// All lifecycle events for order-123 go to same partition → strict FIFO ordering
kafkaTemplate.send("order-events", "order-123", new OrderCreatedEvent("order-123"));
kafkaTemplate.send("order-events", "order-123", new OrderShippedEvent("order-123"));
kafkaTemplate.send("order-events", "order-123", new OrderDeliveredEvent("order-123"));
// Consumer always sees: CREATED → SHIPPED → DELIVERED for order-123

// Different orders go to different partitions — processed in parallel (no cross-order ordering)
kafkaTemplate.send("order-events", "order-456", new OrderCreatedEvent("order-456")); // partition 3
kafkaTemplate.send("order-events", "order-789", new OrderCreatedEvent("order-789")); // partition 1

// Exactly-once semantics (EOS): transactional producer
// Prevents duplicate events when producer retries after network error
@Bean
public ProducerFactory<String, Object> exactlyOnceProducerFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
    props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-service-tx-1"); // unique per instance
    props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
    props.put(ProducerConfig.ACKS_CONFIG, "all");
    return new DefaultKafkaProducerFactory<>(props);
}

// Consumer must set isolation.level=read_committed to skip aborted transactions
// spring.kafka.consumer.properties.isolation.level: read_committed

// When you DON'T need strict ordering (e.g., user-events dashboard):
// Use null key → round-robin across all partitions → maximum throughput
```

### 💡 Lời khuyên thực tế

Dùng entity ID (orderId, userId) làm Kafka message key cho entity-level ordering. Điều này đủ cho hầu hết trường hợp. Full exactly-once qua produce + consume cần transactional producer VÀ `isolation.level=read_committed` trên consumer.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Kafka có thể đảm bảo thứ tự qua các partition không?</b></summary>

Không thể đảm bảo thứ tự giữa các partition khác nhau, chỉ đảm bảo thứ tự tuần tự trong nội bộ của một partition duy nhất.
</details>

<details>
<summary><b>Q: Làm thế nào để đảm bảo tất cả event của một user được xử lý theo thứ tự?</b></summary>

Thiết lập `user_id` làm Message Key khi gửi tin. Kafka sẽ băm (hash) key này để luôn định tuyến toàn bộ event của user này vào cùng một partition.
</details>

<details>
<summary><b>Q: Exactly-once semantics trong Kafka là gì và đạt được thế nào?</b></summary>

Là đảm bảo một chuỗi xử lý (đọc -> xử lý -> ghi) diễn ra chính xác 1 lần. Đạt được bằng cách bật `enable.idempotence=true` cho producer, dùng Transactional API kết hợp đồng bộ hóa offset consumer trong transaction.
</details>
