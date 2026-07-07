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

- **Q:** Vai trò của partition trong Kafka là gì?
- **Q:** Kafka đảm bảo thứ tự message thế nào?
- **Q:** Sự khác biệt giữa Kafka và RabbitMQ là gì?
