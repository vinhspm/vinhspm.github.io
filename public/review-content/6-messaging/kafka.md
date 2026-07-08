# Apache Kafka

**Breadcrumb:** 6. Messaging

> Kafka là nền tảng event streaming phân tán cung cấp message delivery throughput cao, fault-tolerant, có thứ tự với durable log storage và consumer group semantics.

## Các điểm chính

- ✦ Core: **Topic** (luồng logic), **Partition** (đơn vị parallelism), **Offset** (vị trí message).
- ✦ Producer ghi vào topic; Consumer đọc từ topic qua consumer group.
- ✦ Retention: message giữ trên disk trong khoảng thời gian cấu hình (mặc định 7 ngày) — replay được.
- ✦ Throughput cao: ghi disk tuần tự, zero-copy, batching, compression.
- ✦ Replication: mỗi partition có leader + replica cho fault tolerance.

*Spring Kafka: async producer với error fallback + manual-ack consumer*
```java
// Spring Kafka: full producer + consumer for order-events
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final OutboxRepository outboxRepo;

    // orderId as key → all events for same order go to same partition (ordered)
    public void publishOrderCreated(OrderCreatedEvent event) {
        kafkaTemplate.send("order-events", event.getOrderId(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish order-events: orderId={}", event.getOrderId(), ex);
                    // Fallback: persist to outbox table for retry
                    outboxRepo.save(new OutboxMessage("order-events", event));
                } else {
                    RecordMetadata meta = result.getRecordMetadata();
                    log.info("Published: orderId={} partition={} offset={}",
                        event.getOrderId(), meta.partition(), meta.offset());
                }
            });
    }
}

// Consumer: manual ack — offset committed only after successful processing
@Component
@RequiredArgsConstructor
public class InventoryConsumer {
    private final InventoryService inventoryService;

    @KafkaListener(topics = "order-events", groupId = "inventory-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void onOrderEvent(OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack) {
        log.info("Consuming: orderId={} p={} o={}", event.getOrderId(), partition, offset);
        inventoryService.reserveStock(event); // process first
        ack.acknowledge();                    // then commit offset (at-least-once)
    }
}

// application.yml: strong guarantees config
// spring.kafka.producer.acks: all
// spring.kafka.producer.enable-idempotence: true
// spring.kafka.listener.ack-mode: manual
// spring.kafka.consumer.enable-auto-commit: false
```

### 💡 Lời khuyên thực tế

Dùng Kafka cho: event sourcing, cross-service event streaming, activity feed, audit log, CDC (change data capture). Đặt `acks=all` và `enable.idempotence=true` trên producer cho exactly-once ở phía producer.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Vai trò của partition trong Kafka là gì?</b></summary>

Là đơn vị phân tán dữ liệu cơ bản giúp Kafka lưu trữ dung lượng lớn hơn 1 ổ đĩa và cho phép nhiều consumer đọc song song, quyết định khả năng scale-out của hệ thống.
</details>

<details>
<summary><b>Q: Kafka đảm bảo thứ tự message thế nào?</b></summary>

Chỉ đảm bảo thứ tự ghi nhận và đọc ra chính xác trên **cùng một Partition**. Muốn đảm bảo thứ tự, cần sử dụng chung một Message Key để các tin nhắn được phân bổ vào cùng một partition.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa Kafka và RabbitMQ là gì?</b></summary>

Kafka dựa trên mô hình append-only log (đọc không xóa dữ liệu, giữ dữ liệu lâu dài, cho phép replay). RabbitMQ dựa trên mô hình Smart Broker / Dumb Consumer (gửi xong xóa ngay khỏi queue, hỗ trợ định tuyến phức tạp linh hoạt).
</details>
