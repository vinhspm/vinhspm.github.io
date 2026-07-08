# Singleton Pattern

**Breadcrumb:** 10. Design Patterns › Creational

> Singleton đảm bảo chỉ tồn tại một instance mỗi JVM — trong Spring, tất cả bean là singleton theo mặc định; hiếm khi cần implement Singleton thủ công.

## Các điểm chính

- ✦ Classic: private constructor + static getInstance(). Cần <code>volatile</code> cho DCL thread-safety.
- ✦ Tốt hơn: initialization-on-demand holder — lazy, thread-safe, không overhead synchronization.
- ✦ Spring bean là singleton mặc định — ưu tiên cách này hơn implement thủ công.
- ✦ Vấn đề: global state làm test khó; inject qua DI thay vì static lookup.

*Spring @Component singleton + Enum singleton + Holder idiom + DCL (reference)*
```java
// ── 1. Spring @Component — the idiomatic singleton (preferred) ──────────────
@Component   // Spring creates ONE instance and injects it everywhere
public class OrderIdGenerator {
    private final AtomicLong sequence = new AtomicLong(1000L);
    public String generate() {
        return "ORD-" + LocalDate.now() + "-" + sequence.incrementAndGet();
    }
}
// Usage: @Autowired OrderIdGenerator generator; — easily mockable in tests

// ── 2. Enum Singleton — simplest thread-safe, serialization-safe ─────────────
public enum RegionConfig {
    INSTANCE;
    private final String defaultRegion = System.getenv().getOrDefault("AWS_REGION", "ap-southeast-1");
    private final int    maxOrderItems = 100;
    public String defaultRegion() { return defaultRegion; }
    public int    maxOrderItems()  { return maxOrderItems; }
}
// Usage: RegionConfig.INSTANCE.defaultRegion()

// ── 3. Initialization-on-demand Holder — lazy, thread-safe without sync ──────
public class LegacyConnectionPool {
    private LegacyConnectionPool() {
        // expensive initialization: open DB connections, load config
        loadConfig();
        initPoolConnections();
    }
    // JVM guarantees: Holder is initialized only when getInstance() is first called
    private static class Holder {
        static final LegacyConnectionPool INSTANCE = new LegacyConnectionPool();
    }
    public static LegacyConnectionPool getInstance() { return Holder.INSTANCE; }
}

// ── 4. Classic DCL (Double-Checked Locking) — for educational reference ──────
// Note: volatile is REQUIRED to prevent instruction reorder on multi-core CPUs
public class RateLimiter {
    private static volatile RateLimiter instance;
    private final int maxRps;
    private RateLimiter(int maxRps) { this.maxRps = maxRps; }
    public static RateLimiter getInstance() {
        if (instance == null) {                        // first check (no lock)
            synchronized (RateLimiter.class) {
                if (instance == null) {                // second check (with lock)
                    instance = new RateLimiter(1000);
                }
            }
        }
        return instance;
    }
}
// ⚠️ In Spring apps, NEVER use manual singleton — use @Component/@Bean instead
```

### 💡 Lời khuyên thực tế

Trong Spring app không có lý do để implement Singleton thủ công. Tất cả bean @Component/@Service/@Repository đều là singleton. Dùng prototype scope khi cần instance mới mỗi lần gọi.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Tại sao classic Singleton khó test?</b></summary>

Vì constructor của nó là private nên không thể tạo đối tượng giả lập (mock/stub) khi viết unit test cho các class phụ thuộc vào nó, đồng thời nó giữ trạng thái toàn cục (global state) xuyên suốt luồng chạy test gây ảnh hưởng chéo kết quả test.
</details>

<details>
<summary><b>Q: Initialization-on-demand holder idiom là gì?</b></summary>

Là cách tạo Singleton an toàn đa luồng (thread-safe) tối ưu nhất trong Java mà không cần dùng `synchronized`. Sử dụng một static nested class (holder); class holder này chỉ được JVM nạp vào bộ nhớ và khởi tạo đối tượng duy nhất khi phương thức lấy instance được gọi lần đầu tiên.
</details>

<details>
<summary><b>Q: Spring xử lý Singleton khác gì so với pattern?</b></summary>

Classic Singleton giới hạn duy nhất 1 instance trên mỗi ClassLoader. Spring Singleton giới hạn duy nhất 1 instance ứng với mỗi Bean ID bên trong phạm vi quản lý của một Spring IoC Container cụ thể.
</details>
