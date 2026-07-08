# Redis

**Breadcrumb:** 4. Database › NoSQL

> Redis là in-memory data structure store dùng cho caching, session, pub/sub messaging, rate limiting và distributed lock — với latency dưới mili-giây.

## Các điểm chính

- ✦ Cấu trúc dữ liệu: String, List, Set, Sorted Set (ZSet), Hash, Stream, Bitmap, HyperLogLog.
- ✦ Persistence: RDB snapshot + AOF (append-only file) cho durability. Chế độ cache thuần: không persistence.
- ✦ Pub/Sub: messaging nhẹ. Cho messaging bền vững, dùng Redis Streams.
- ✦ Thao tác atomic: <code>INCR</code>, <code>SETNX</code>, <code>GETSET</code>, <code>LPUSH/RPOP</code>.
- ✦ Cluster mode: sharding qua node. Sentinel: HA không sharding.
- ✦ TTL: đặt expiry với <code>EXPIRE key seconds</code> — tự động evict cache entry.

*Redis: product cache, cart (Hash), rate limiting (INCR), distributed lock (SETNX), @Cacheable*
```java
// ✅ Redis use cases in Spring Boot e-commerce platform

@Service
public class RedisService {
    @Autowired
    private RedisTemplate<String, Object> redis;
    @Autowired
    private StringRedisTemplate stringRedis;

    // --- Use case 1: Cache product details (String / JSON) ---
    // Key pattern: "product:{id}" — TTL 10 minutes (product data changes infrequently)
    public Product getProduct(Long id) {
        String key = "product:" + id;
        Product cached = (Product) redis.opsForValue().get(key);
        if (cached != null) return cached;
        Product product = productRepository.findById(id).orElseThrow();
        redis.opsForValue().set(key, product, 10, TimeUnit.MINUTES);
        return product;
    }

    // --- Use case 2: Shopping cart (Hash — one key per user, fields per product) ---
    // HSET cart:user:42 product:99 2    → add 2 units of product 99
    // HGETALL cart:user:42              → get full cart
    public void addToCart(Long userId, Long productId, int qty) {
        String key = "cart:user:" + userId;
        redis.opsForHash().put(key, "product:" + productId, String.valueOf(qty));
        redis.expire(key, 7, TimeUnit.DAYS);  // cart expires after 7 days of inactivity
    }
    public Map<Object, Object> getCart(Long userId) {
        return redis.opsForHash().entries("cart:user:" + userId);
    }

    // --- Use case 3: Rate limiting (atomic INCR + EXPIRE) ---
    // Token bucket approximation: fixed window per second per client
    public boolean isRateLimitAllowed(String clientId, int maxPerSecond) {
        String key = "ratelimit:" + clientId + ":" + (System.currentTimeMillis() / 1000);
        Long count = stringRedis.opsForValue().increment(key);
        if (count == 1) stringRedis.expire(key, 2, TimeUnit.SECONDS);  // 2s safety margin
        return count <= maxPerSecond;  // false → return HTTP 429
    }

    // --- Use case 4: Distributed lock (SETNX + Expiry — simple version) ---
    // Production: use Redisson RLock for Redlock algorithm
    public boolean acquireLock(String resource, String requestId, long ttlMs) {
        // SET NX EX: set only if not exists + expiry in one atomic command
        Boolean acquired = stringRedis.opsForValue()
            .setIfAbsent("lock:" + resource, requestId, ttlMs, TimeUnit.MILLISECONDS);
        return Boolean.TRUE.equals(acquired);
    }
    public void releaseLock(String resource, String requestId) {
        // Only release if we own the lock (check requestId matches)
        String currentHolder = stringRedis.opsForValue().get("lock:" + resource);
        if (requestId.equals(currentHolder)) {
            stringRedis.delete("lock:" + resource);
        }
    }
}

// ✅ @Cacheable — Spring Cache abstraction backed by Redis
@Service
public class ProductService {
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product findById(Long id) { return productRepository.findById(id).orElse(null); }

    @CacheEvict(value = "products", key = "#product.id")
    public Product update(Product product) { return productRepository.save(product); }
}
```

### 💡 Lời khuyên thực tế

Dùng `@Cacheable`/`@CacheEvict` với Redis CacheManager cho method-level caching trong suốt trong Spring. Cho distributed lock, dùng `RLock` của Redisson implement Redlock algorithm đúng.

### ❓ Câu hỏi phỏng vấn

- **Q:** Các cấu trúc dữ liệu chính trong Redis và trường hợp sử dụng là gì?
  <details>
  <summary><b>Trả lời:</b></summary>

  String: Cache cơ bản, counter; List: Queue, feed; Set: Nhóm không trùng, giao/hợp; Hash: User profile; Sorted Set: Leaderboard.
  </details>
- **Q:** Redis đạt durability thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Qua 2 cơ chế: RDB (chụp snapshot nhanh xuống đĩa định kỳ) và AOF (ghi log lại các lệnh ghi liên tục). Có thể dùng cả hai song song.
  </details>
- **Q:** Làm thế nào để implement rate limiter dùng Redis?
  <details>
  <summary><b>Trả lời:</b></summary>

  Có thể sử dụng thuật toán Fixed Window đơn giản bằng cách dùng `INCR` khóa IP/User theo phút kết hợp `EXPIRE`, hoặc dùng Sorted Set cho thuật toán Sliding Window chính xác hơn.
  </details>
