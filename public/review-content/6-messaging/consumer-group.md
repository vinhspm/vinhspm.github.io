# Kafka Consumer Group

**Breadcrumb:** 6. Messaging › Kafka

> Consumer group cho phép nhiều consumer đọc từ topic song song, với mỗi partition được gán cho đúng một consumer trong group, cho phép horizontal scaling của consumption.

## Các điểm chính

- ✦ Mỗi message được giao đến đúng MỘT consumer mỗi group (load balancing).
- ✦ Nhiều group trên cùng topic: mỗi group nhận TẤT CẢ message độc lập (fan-out).
- ✦ Phân công partition-to-consumer: Kafka coordinator quản lý qua rebalance protocol.
- ✦ Rebalance: được kích hoạt khi consumer join/rời/crash. Gây tạm dừng xử lý.
- ✦ Max parallelism = số partition. Consumer vượt quá số partition sẽ ngồi idle.
- ✦ <code>group.id</code> xác định group; offset được theo dõi mỗi group mỗi partition.

*Consumer Group fan-out: 3 groups trên order-events + scaling + cooperative rebalance*
```java
// Consumer Group: fan-out pattern — multiple services consume same order-events
// Each group gets ALL messages independently (different group.id = independent offset)

// Group 1: inventory-service reserves stock
@KafkaListener(topics = "order-events", groupId = "inventory-service")
public void reserveStock(OrderCreatedEvent event, Acknowledgment ack) {
    inventoryService.reserve(event.getOrderId(), event.getItems());
    ack.acknowledge();
}

// Group 2: notification-service sends confirmation email
@KafkaListener(topics = "order-events", groupId = "notification-service")
public void sendConfirmation(OrderCreatedEvent event, Acknowledgment ack) {
    notificationService.sendOrderConfirmed(event.getCustomerEmail(), event.getOrderId());
    ack.acknowledge();
}

// Group 3: analytics-service records metrics (can lag behind, no manual ack needed)
@KafkaListener(topics = "order-events", groupId = "analytics-service")
public void recordMetrics(OrderCreatedEvent event) {
    metricsService.recordNewOrder(event.getOrderId(), event.getTotalAmount());
    // auto-commit is fine for analytics — losing a metric is acceptable
}

// Scaling: topic has 6 partitions → max 6 consumer instances per group
// Deploy 3 instances of inventory-service → each handles 2 partitions
// Add 3 more instances → each handles 1 partition (max parallelism)
// Add a 7th instance → it sits idle (no partition to assign)

// Rebalance: triggered when consumer joins/leaves/crashes
// Use CooperativeStickyAssignor to minimize partition movement during rebalance:
// spring.kafka.consumer.partition-assignment-strategy:
//   org.apache.kafka.clients.consumer.CooperativeStickyAssignor
```

### 💡 Lời khuyên thực tế

Thiết kế số partition cho parallelism consumer mong đợi. Nếu cần 10 consumer song song cho topic, cần ít nhất 10 partition. Xem xét cooperative rebalancing (`CooperativeStickyAssignor`) để giảm downtime rebalance.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Consumer group là gì và giải quyết vấn đề gì?</b></summary>

Là nhóm các consumer cùng chia sẻ việc tiêu thụ dữ liệu của một Topic. Giải quyết vấn đề mở rộng quy mô xử lý (scale-out) song song và tự động chia sẻ tải/chịu lỗi (fault tolerance).
</details>

<details>
<summary><b>Q: Số consumer active tối đa trong consumer group là bao nhiêu?</b></summary>

Bằng số lượng **Partition** của topic đó. Số consumer vượt quá số partition sẽ ở trạng thái rảnh rỗi (idle) chờ dự phòng.
</details>

<details>
<summary><b>Q: Điều gì trigger Kafka rebalance và ảnh hưởng của nó là gì?</b></summary>

Trigger khi có consumer tham gia/rời nhóm, consumer crash (mất heartbeat), hoặc số partition thay đổi. Ảnh hưởng: Tạm dừng việc đọc tin nhắn của cả nhóm (STW), có thể gây trễ (lag) và lãng phí tài nguyên xử lý lại.
</details>
