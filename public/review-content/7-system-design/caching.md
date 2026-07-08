# Caching

**Breadcrumb:** 7. System Design

> Caching lưu dữ liệu thường xuyên truy cập trong memory nhanh để giảm latency và tải DB, dùng chiến lược như Cache-Aside, Write-Through và eviction policy phù hợp.

## Các điểm chính

- ✦ Cache hit: dữ liệu trong cache, trả về ngay. Cache miss: fetch từ nguồn, lưu vào cache.
- ✦ TTL (Time To Live): tự động hết hạn dữ liệu cũ. Cân bằng freshness vs hit rate.
- ✦ Cache invalidation: vấn đề khó nhất. Tùy chọn: TTL, event-driven invalidation, write-through.
- ✦ **L1**: in-process (Caffeine). **L2**: distributed (Redis). **L3**: CDN (static asset).
- ✦ Cache warming: pre-populate khi khởi động để tránh cold-start miss storm.

*Two-level cache: Caffeine L1 + Redis L2 config; @Cacheable/@CachePut/@CacheEvict; hit rate monitoring*
```java
// Two-level cache: Caffeine (L1, per-instance, nanoseconds) + Redis (L2, shared, milliseconds)
@Configuration
public class CacheConfig {
    // L1: Caffeine — in-process, ultra-fast (no network), but per-instance
    @Bean
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager("products", "users");
        mgr.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats()); // enable hit rate metrics
        return mgr;
    }

    // L2: Redis — shared across all instances, survives restart
    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));
        return RedisCacheManager.builder(factory).cacheDefaults(config).build();
    }
}

// Service: declarative caching with @Cacheable (uses configured CacheManager)
@Service @RequiredArgsConstructor
public class ProductService {
    private final ProductRepository repo;

    // Cache-Aside: check cache first, populate on miss
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product findById(Long id) {
        return repo.findById(id).orElse(null); // only called on cache MISS
    }

    // Write-Through: update cache when DB is updated
    @CachePut(value = "products", key = "#result.id")
    public Product update(Product product) {
        return repo.save(product); // cache updated with return value
    }

    // Cache eviction on delete
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        repo.deleteById(id);
    }

    // Scheduled full eviction (safety net for stale data)
    @CacheEvict(value = "products", allEntries = true)
    @Scheduled(fixedDelay = 3_600_000) // every 1 hour
    public void evictAll() {}
}

// Monitor cache effectiveness:
// caffeineCacheManager.getCache("products").getNativeCache() → stats.hitRate()
// Target hit rate > 90%; if lower → wrong TTL, wrong key strategy, or cache too small
```

### 💡 Lời khuyên thực tế

Cấu hình two-level cache: Caffeine (L1, nanosecond, per-instance) backed bởi Redis (L2, millisecond, shared). Điều này giảm Redis network overhead cho hot key trong khi vẫn nhất quán qua các instance.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Cache stampede là gì và làm thế nào để ngăn?</b></summary>

Giống Thundering Herd, xảy ra khi nhiều luồng cùng đọc DB khi cache miss. Ngăn chặn bằng cách dùng Lock/Mutex cho luồng đầu tiên đi tải dữ liệu, hoặc tính toán cập nhật cache chạy ngầm trước khi hết hạn (probabilistic early expiration).
</details>

<details>
<summary><b>Q: Sự khác biệt giữa cache invalidation và TTL-based expiry là gì?</b></summary>

Cache Invalidation là chủ động xóa hoặc cập nhật cache ngay khi dữ liệu gốc thay đổi. TTL-based Expiry là tự động giải phóng key cache sau một khoảng thời gian thiết lập sẵn bất kể dữ liệu gốc có đổi hay không.
</details>

<details>
<summary><b>Q: Làm thế nào để implement cache warming khi khởi động ứng dụng?</b></summary>

Sử dụng các hook khởi động ứng dụng (ví dụ `@EventListener(ApplicationReadyEvent.class)` trong Spring) để chủ động truy vấn các dữ liệu tĩnh, cấu hình hệ thống, hoặc dữ liệu truy cập nhiều từ DB và đẩy vào Redis trước khi mở cổng nhận request từ người dùng.
</details>
