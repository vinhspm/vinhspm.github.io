# CQRS (Command Query Responsibility Segregation)

**Breadcrumb:** 7. System Design › Database Scaling

> CQRS tách biệt write model (Command) khỏi read model (Query), cho phép mỗi cái được tối ưu, scale và thậm chí lưu trữ khác nhau — thường kết hợp với Event Sourcing.

## Các điểm chính

- ✦ Command side: xử lý mutation, enforce business rule, emit event. Relational DB chuẩn hóa.
- ✦ Query side: xử lý read, denormalized/tối ưu cho query pattern. Có thể là ES index, Redis, read replica.
- ✦ Sync: event từ command side cập nhật read model phía query side (eventually consistent).
- ✦ Lợi ích: tối ưu read và write độc lập, chiến lược scaling khác nhau.
- ✦ Chi phí: eventual consistency giữa read và write side, phức tạp vận hành.

*CQRS: Command (normalized + business rules) → Event → Query (denormalized view + ES); eventual consistency*
```java
// CQRS: Command side writes normalized domain model; Query side reads denormalized view
// Sync between them via domain events (eventually consistent)

// ---- COMMAND SIDE: normalized, enforces business rules ----
@Service @RequiredArgsConstructor
public class OrderCommandService {

    @Transactional
    public String placeOrder(PlaceOrderCommand cmd) {
        // Business rule validation on write side
        cmd.getItems().forEach(item ->
            inventoryService.assertStock(item.getProductId(), item.getQuantity()));

        Order order = new Order(cmd.getUserId(), cmd.getItems());
        orderRepo.save(order); // normalized: orders table + order_items table

        // Publish domain event → Query side updates its read model
        eventPublisher.publishEvent(new OrderPlacedEvent(
            order.getId(), cmd.getUserId(), order.getTotal(), cmd.getItems()));
        return order.getId();
    }
}

// ---- QUERY SIDE: denormalized view, optimized for specific UI needs ----
@Service @RequiredArgsConstructor
public class OrderQueryService {

    @Transactional(readOnly = true)
    public OrderDashboardView getOrderDashboard(String userId) {
        // Single optimized query on denormalized view table — no JOINs needed
        return orderViewRepo.findDashboardByUserId(userId);
        // view table has: order_id, status, total, item_count, customer_name — all pre-joined
    }

    @Transactional(readOnly = true)
    public Page<OrderSummary> searchOrders(OrderSearchRequest req, Pageable page) {
        // Query side can use different storage: Elasticsearch for full-text search
        return elasticsearchOrderRepo.search(req.getKeyword(), req.getStatus(), page);
    }
}

// ---- EVENT HANDLER: updates Query read model when Command side writes ----
@Component @RequiredArgsConstructor
public class OrderViewUpdater {

    @EventListener  // or @KafkaListener if event is published to Kafka
    @Transactional
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Build denormalized view for dashboard query
        OrderDashboardView view = OrderDashboardView.builder()
            .orderId(event.getOrderId())
            .userId(event.getUserId())
            .total(event.getTotal())
            .itemCount(event.getItems().size())
            .status(OrderStatus.PENDING)
            .placedAt(Instant.now())
            .build();
        orderViewRepo.save(view);

        // Also update Elasticsearch index for search
        elasticsearchOrderRepo.index(OrderSearchDocument.from(event));
    }
}

// Trade-off: read model may lag behind write model (eventual consistency)
// After placeOrder() returns, getOrderDashboard() may not yet show the new order
// Mitigation: return order ID immediately; UI polls or uses WebSocket for update
```

### 💡 Lời khuyên thực tế

Bắt đầu không có CQRS. Thêm nó khi: read pattern rất khác write pattern, cần scaling khác nhau cho read và write, hoặc đang xây dựng hệ thống audit log. Event Sourcing + CQRS mạnh nhưng thêm độ phức tạp đáng kể.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: CQRS giải quyết vấn đề gì?</b></summary>

Tách biệt hoàn toàn luồng ghi dữ liệu (Commands - tối ưu ghi) và luồng đọc dữ liệu (Queries - tối ưu đọc), giải quyết xung đột hiệu năng khi câu truy vấn đọc quá phức tạp và cần scale độc lập.
</details>

<details>
<summary><b>Q: Eventual consistency biểu hiện thế nào trong CQRS?</b></summary>

Khi thực hiện Command ghi thành công vào DB ghi, cần thời gian đồng bộ (qua CDC hoặc Event) sang DB đọc. Trong khoảng thời gian này, query đọc có thể trả về dữ liệu cũ.
</details>

<details>
<summary><b>Q: Sự khác biệt giữa CQRS và Event Sourcing là gì?</b></summary>

CQRS chỉ là tách biệt đọc/ghi. Event Sourcing lưu trữ trạng thái ứng dụng dưới dạng chuỗi các sự kiện lịch sử không thay đổi (events log). Chúng thường đi kèm với nhau nhưng CQRS có thể hoạt động độc lập mà không cần Event Sourcing.
</details>
