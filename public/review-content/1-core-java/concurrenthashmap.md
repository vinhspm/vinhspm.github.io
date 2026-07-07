# ConcurrentHashMap

**Breadcrumb:** 1. Core Java › Collections

> ConcurrentHashMap cung cấp thao tác map thread-safe mà không cần đồng bộ hóa toàn bộ — dùng segment-level (Java 7) hoặc CAS+bucket-level (Java 8+) locking cho concurrency cao.

## Các điểm chính

- ✦ Java 8+: dùng CAS cho insert bucket rỗng và <code>synchronized</code> trên từng bucket head cho ghi.
- ✦ Đọc không blocking và luôn nhất quán (không stale read như volatile HashMap).
- ✦ <code>putIfAbsent</code>, <code>computeIfAbsent</code>, <code>merge</code>, <code>compute</code> là thao tác atomic.
- ✦ **Không cho phép null key hoặc null value** (ném NullPointerException).
- ✦ <code>size()</code> là xấp xỉ; dùng <code>mappingCount()</code> cho map lớn.
- ✦ So với <code>Collections.synchronizedMap()</code>: synchronized bọc toàn bộ map với một lock — concurrency thấp hơn.

*ConcurrentHashMap: request counter, session cache, aggregator — atomic ops*
```java
import java.util.concurrent.*;
import java.util.*;

// ---- ConcurrentHashMap Java 8+ internals ----
// - Empty bucket: CAS to insert Node (no lock)
// - Non-empty bucket: synchronized on bucket head node only (fine-grained lock)
// - Reads: never blocked (volatile Node references)
// - No null keys or null values (unlike HashMap)

// ---- Use case 1: concurrent request counter per customer ----
public class CustomerRequestTracker {
    // Thread-safe: concurrent increments from multiple request-handling threads
    private final ConcurrentHashMap<String, Long> requestCounts = new ConcurrentHashMap<>();

    public void recordRequest(String customerId) {
        // merge is ATOMIC: read current, apply (Long::sum), write back — no race
        requestCounts.merge(customerId, 1L, Long::sum);
    }

    public long getCount(String customerId) {
        return requestCounts.getOrDefault(customerId, 0L);
    }
}

// ---- Use case 2: lazy-initialized session cache ----
public class SessionCache {
    private final ConcurrentHashMap<String, UserSession> sessions = new ConcurrentHashMap<>();

    public UserSession getOrCreate(String sessionId, String userId) {
        // computeIfAbsent is ATOMIC: only one thread executes the lambda per key
        // even if 100 threads request the same sessionId simultaneously
        return sessions.computeIfAbsent(sessionId,
            id -> new UserSession(id, userId, Instant.now()));
    }

    public void invalidate(String sessionId) {
        sessions.remove(sessionId);
    }
}

// ---- Use case 3: order status aggregation across threads ----
public class OrderStatusAggregator {
    private final ConcurrentHashMap<OrderStatus, List<String>> statusIndex
        = new ConcurrentHashMap<>();

    public void index(Order order) {
        // computeIfAbsent + CopyOnWriteArrayList = concurrent safe indexing
        statusIndex
            .computeIfAbsent(order.getStatus(), k -> new CopyOnWriteArrayList<>())
            .add(order.getId());
    }

    public List<String> getOrderIds(OrderStatus status) {
        return statusIndex.getOrDefault(status, List.of());
    }
}

// ---- size() vs mappingCount() ----
ConcurrentHashMap<String, Order> orderMap = new ConcurrentHashMap<>();
// size() returns int — may overflow for very large maps
// mappingCount() returns long — use for maps potentially > Integer.MAX_VALUE
long count = orderMap.mappingCount();
```

### 💡 Lời khuyên thực tế

Ưu tiên `ConcurrentHashMap.computeIfAbsent()` thay vì pattern double-checked locking cho lazy initialization. Dùng `merge()` cho counter/aggregator trong concurrent stream.

### ❓ Câu hỏi phỏng vấn

- **Q:** ConcurrentHashMap đạt thread-safety trong Java 8 bằng cách nào?
- **Q:** Sự khác biệt giữa putIfAbsent và computeIfAbsent là gì?
- **Q:** Tại sao ConcurrentHashMap không cho phép null value?
