# Eventual Consistency

**Breadcrumb:** 7. System Design › Consistency Patterns

> Eventual consistency đảm bảo tất cả replica sẽ hội tụ về cùng giá trị theo thời gian mà không có write mới — chấp nhận staleness tạm thời để đổi lấy availability và latency thấp hơn.

## Các điểm chính

- ✦ Không có synchronization cost khi write — mỗi replica chấp nhận write độc lập.
- ✦ Cần conflict resolution khi concurrent write cùng key: last-write-wins (LWW), CRDT, vector clock.
- ✦ Use case: DNS, shopping cart, social media like, NoSQL replication, CDN cache.
- ✦ KHÔNG phù hợp cho: giao dịch tài chính, tồn kho (phải ngăn oversell), authentication token.
- ✦ Thường hội tụ trong mili giây đến giây, tùy thuộc vào topology replication.

*Eventual consistency: CQRS event lag; optimistic UI; DynamoDB consistency level; CRDT conflict resolution*
```java
// Eventual Consistency in practice: CQRS read model sync
// Command side writes → publishes event → Query side eventually updates
// Gap between write and read model update = inconsistency window (ms to seconds)

@Service @RequiredArgsConstructor
public class OrderCommandService {

    @Transactional
    public String placeOrder(PlaceOrderCommand cmd) {
        Order order = orderRepo.save(new Order(cmd));
        // Publish event: query side (dashboard) will update eventually
        eventPublisher.publishEvent(new OrderPlacedEvent(order.getId(), order.getUserId(),
            order.getTotal(), Instant.now()));
        return order.getId();
        // At this point, getOrderDashboard() may NOT yet show this order (eventual)
    }
}

@Component @RequiredArgsConstructor
public class OrderDashboardUpdater {

    @EventListener  // or @KafkaListener for cross-service async
    @Transactional
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Updates read model: usually completes in <100ms (same JVM) or <1s (via Kafka)
        orderDashboardRepo.save(OrderDashboardView.builder()
            .orderId(event.getOrderId())
            .userId(event.getUserId())
            .total(event.getTotal())
            .status(OrderStatus.PENDING)
            .placedAt(event.getPlacedAt())
            .build());
    }
}

// Designing for eventual consistency:
// 1. Include version/timestamp in entity — detect stale reads
// 2. Use idempotent operations — safe to re-apply if event replayed
// 3. UI: optimistic update (show result immediately) + confirm when sync completes
// 4. DynamoDB: per-request consistency level
//    GetItemRequest.builder().consistentRead(false).build()  // eventually consistent (cheaper)
//    GetItemRequest.builder().consistentRead(true).build()   // strongly consistent (2x read units)

// Conflict resolution when two writes race (no distributed lock):
// Last-Write-Wins (LWW): use timestamp; risk: clock skew picks wrong winner
// Vector clocks: causal ordering; Cassandra, Riak use this
// CRDTs (Conflict-free Replicated Data Types): merge automatically
//   example: shopping cart as OR-Set (add wins over remove) → safe to merge from any replica
```

### 💡 Lời khuyên thực tế

Thiết kế data model cho eventual consistency nơi bạn dùng nó: dùng thao tác idempotent, bao gồm version number trong entity, và hiển thị thông báo UI phù hợp ("đơn hàng của bạn đang được xử lý") thay vì hiển thị total stale.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Làm thế nào để giải thích eventual consistency cho stakeholder không kỹ thuật?</b></summary>

Giống như gửi email công việc nhóm: Bạn gửi email cập nhật file, đồng nghiệp có thể chưa đọc ngay lập tức, nhưng cuối ngày tất cả mọi người sẽ đọc và nắm được thông tin đồng bộ như nhau.
</details>

<details>
<summary><b>Q: Conflict nào có thể phát sinh với eventual consistency và giải quyết thế nào?</b></summary>

Lỗi ghi đè chéo (xung đột ghi song song). Giải quyết bằng quy tắc: Last-Write-Wins (dùng timestamp), Vector Clocks để theo dõi lịch sử phiên bản, hoặc dùng cấu hình CRDT để tự động merge.
</details>

<details>
<summary><b>Q: Đưa ví dụ khi eventual consistency chấp nhận được vs nguy hiểm.</b></summary>

Chấp nhận được: Số lượt xem video Youtube, số lượt thích Facebook, cập nhật thông tin profile. Nguy hiểm: Số dư tài khoản ngân hàng, hệ thống đặt chỗ máy bay/rạp phim (gây overbooking).
</details>
