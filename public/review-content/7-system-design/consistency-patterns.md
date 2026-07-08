# Consistency Pattern

**Breadcrumb:** 7. System Design

> Consistency pattern xác định dữ liệu cần cập nhật đến mức nào qua các node hệ thống phân tán — từ linearizability nghiêm ngặt đến eventual consistency với các trade-off khác nhau.

## Các điểm chính

- ✦ **Strong Consistency**: read luôn trả về write gần nhất. Cần synchronous replication. Latency cao hơn.
- ✦ **Eventual Consistency**: tất cả node sẽ hội tụ về cùng giá trị khi không có update mới. Availability cao hơn.
- ✦ **Read-Your-Writes**: user luôn thấy write của họ, dù người khác có thể thấy stale.
- ✦ **Monotonic Read**: nếu bạn đọc giá trị X, bạn không bao giờ đọc giá trị cũ hơn X trong lần đọc tương lai.
- ✦ **Session Consistency**: trong một session, đảm bảo read-your-writes và monotonic read.

*5 consistency patterns: strong, eventual, read-your-writes, monotonic reads, session consistency với code*
```java
// Consistency patterns: strong vs eventual in Spring Boot + multi-DB context

// 1. STRONG CONSISTENCY: PostgreSQL single node — default ACID behavior
@Transactional(isolation = Isolation.READ_COMMITTED)  // default
public OrderSummary getOrderSummary(String orderId) {
    // Always reads the latest committed data — no stale reads within this DB
    return orderRepo.findById(orderId).map(OrderSummary::from).orElseThrow();
}

// 2. EVENTUAL CONSISTENCY: read replica (async replication lag 10ms-1s)
@Transactional(readOnly = true) // → routed to read replica
public List<OrderSummary> getRecentOrders(String userId) {
    // May return orders placed 200ms ago but not yet replicated
    // Acceptable for: dashboard, history, analytics
    return orderRepo.findByUserIdOrderByCreatedAtDesc(userId, PAGE_LAST_10);
}

// 3. READ-YOUR-WRITES: user must see their own changes immediately
@Transactional
public Order placeOrder(PlaceOrderCommand cmd) {
    Order order = orderRepo.save(new Order(cmd)); // write to primary
    // Return immediately from SAME TRANSACTION on primary → read-your-writes guaranteed
    // Do NOT redirect to replica immediately after (replication lag would break this)
    return order;
}

// 4. MONOTONIC READS: prevent "going back in time" across multiple reads
// Problem: user reads order (version 5) from replica-A, then reads same order
// from replica-B which is lagging → sees version 4!
// Solution: session affinity to same replica, OR route user to primary for X seconds after write

// 5. SESSION CONSISTENCY: combine read-your-writes + monotonic reads
// Implementation: track last-write timestamp in user session
// If request has write within last 5 seconds → route to primary
@GetMapping("/orders/{orderId}")
public Order getOrder(@PathVariable String orderId, HttpSession session) {
    Instant lastWrite = (Instant) session.getAttribute("lastOrderWrite");
    boolean recentWrite = lastWrite != null &&
        Duration.between(lastWrite, Instant.now()).getSeconds() < 5;
    // recentWrite → query primary; otherwise → replica (via @Transactional(readOnly=true))
    return recentWrite ? orderQueryService.fromPrimary(orderId)
                       : orderQueryService.fromReplica(orderId);
}
```

### 💡 Lời khuyên thực tế

Với thao tác hiển thị cho user, đảm bảo "read-your-writes" consistency — user phải thấy thay đổi của họ ngay lập tức. Với analytical dashboard query qua region, eventual consistency ổn (stale vài giây chấp nhận được).

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa eventual consistency và strong consistency là gì?</b></summary>

Strong Consistency đảm bảo mọi Client đọc đều thấy dữ liệu mới nhất ngay lập tức sau lệnh ghi. Eventual Consistency chấp nhận dữ liệu có độ trễ đồng bộ, các Client đọc có thể thấy dữ liệu cũ nhưng sau cùng tất cả sẽ đồng nhất.
</details>

<details>
<summary><b>Q: "Read-your-writes" consistency là gì và làm thế nào để implement?</b></summary>

Đảm bảo một user luôn thấy dữ liệu họ vừa tự ghi/cập nhật. Implement bằng cách luôn hướng các request đọc của chính user đó trực tiếp vào Primary Database trong một khoảng thời gian ngắn thay vì đọc từ Read Replica bị lag.
</details>

<details>
<summary><b>Q: CRDT là gì và giúp gì với eventual consistency?</b></summary>

Conflict-free Replicated Data Type là các cấu trúc dữ liệu tự động giải quyết xung đột khi đồng bộ hóa song song giữa các node mà không cần điều phối tập trung (như đếm số, tập hợp).
</details>
