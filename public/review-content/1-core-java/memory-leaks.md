# Memory Leak trong Java

**Breadcrumb:** 1. Core Java › JVM Internals

> Memory leak trong Java xảy ra khi object vẫn còn reachable (qua GC root) nhưng không còn cần thiết, khiến heap tăng dần đến khi OutOfMemoryError.

## Các điểm chính

- ✦ Nguyên nhân phổ biến: static collection giữ tham chiếu, listener/callback chưa đóng, ThreadLocal không xóa, cache không có eviction.
- ✦ **ThreadLocal leak**: trong môi trường thread-pool, phải gọi <code>ThreadLocal.remove()</code> tường minh.
- ✦ **Static collection**: thêm vào <code>static Map</code> mà không giới hạn kích thước.
- ✦ **Inner class reference**: non-static inner class giữ tham chiếu ngầm đến outer class.
- ✦ Công cụ phát hiện: heap dump (<code>jmap -dump</code>), Eclipse MAT, VisualVM, Async Profiler.

*Memory leaks: ThreadLocal in filter, unbounded cache (Caffeine fix), listener leak*
```java
import com.github.benmanes.caffeine.cache.*;
import java.util.concurrent.TimeUnit;

// ============================================================
// Memory Leak Pattern 1: ThreadLocal in thread pool
// ============================================================
// Thread pool reuses threads; ThreadLocal value from request N
// leaks into request N+1 unless explicitly removed.

public class OrderRequestContext {
    // Holds current user info during a request (set by auth filter)
    private static final ThreadLocal<UserContext> CTX = new ThreadLocal<>();

    public static void set(UserContext ctx) { CTX.set(ctx); }
    public static UserContext get()         { return CTX.get(); }

    // CRITICAL: must be called in finally — guarantees cleanup even on exception
    public static void clear()              { CTX.remove(); }
}

// Servlet filter — sets and cleans up context around each request
public class UserContextFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        try {
            User user = (User) ((HttpServletRequest) req).getAttribute("authenticatedUser");
            OrderRequestContext.set(new UserContext(user));
            chain.doFilter(req, res);
        } finally {
            OrderRequestContext.clear();  // ALWAYS clear — thread goes back to pool
        }
    }
}

// ============================================================
// Memory Leak Pattern 2: Unbounded static collection
// ============================================================
public class ProductService {
    // LEAK: grows forever — no eviction, no size limit
    private static final Map<String, Product> PRODUCT_CACHE_BAD = new HashMap<>();

    // FIX: Caffeine cache with size bound and TTL
    private static final Cache<String, Product> PRODUCT_CACHE = Caffeine.newBuilder()
        .maximumSize(10_000)                    // LRU eviction at 10K entries
        .expireAfterWrite(30, TimeUnit.MINUTES) // stale data auto-removed
        .recordStats()                          // hit rate monitoring
        .build();

    public Product getProduct(String productId) {
        return PRODUCT_CACHE.get(productId, id -> productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id)));
    }

    // Expose cache metrics to Micrometer/Prometheus
    public CacheStats cacheStats() { return PRODUCT_CACHE.stats(); }
}

// ============================================================
// Memory Leak Pattern 3: Listener / callback not deregistered
// ============================================================
public class OrderEventService {
    private final List<OrderEventListener> listeners = new CopyOnWriteArrayList<>();

    public void subscribe(OrderEventListener listener) {
        listeners.add(listener);
    }

    // MUST provide unsubscribe; otherwise listeners accumulate per session/user
    public void unsubscribe(OrderEventListener listener) {
        listeners.remove(listener);
    }

    public void publish(OrderEvent event) {
        listeners.forEach(l -> l.onEvent(event));
    }
}
```

### 💡 Lời khuyên thực tế

Trong Spring web app: `RequestContextHolder` dùng ThreadLocal. Servlet container tự dọn, nhưng ThreadLocal tùy chỉnh trong async code hoặc background thread cần dọn thủ công. Dùng Caffeine cho in-process cache — nó tự xử lý eviction.

### ❓ Câu hỏi phỏng vấn

- **Q:** ThreadLocal có thể gây memory leak trong thread pool như thế nào?
- **Q:** Bạn dùng công cụ nào để chẩn đoán memory leak trong Java?
- **Q:** Non-static inner class gây memory leak như thế nào?
