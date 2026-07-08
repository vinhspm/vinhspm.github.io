# Chính Sách Eviction Cache

**Breadcrumb:** 7. System Design › Caching

> Eviction policy xác định entry cache nào bị xóa khi cache đầy — LRU (Least Recently Used) phổ biến nhất; LFU và TTL-based phục vụ access pattern khác nhau.

## Các điểm chính

- ✦ **LRU** (Least Recently Used): evict entry ít được truy cập gần đây nhất. Tốt cho temporal locality.
- ✦ **LFU** (Least Frequently Used): evict entry với số lần truy cập thấp nhất. Tốt hơn cho access lệch (hot item).
- ✦ **TTL**: hết hạn sau thời gian cố định, bất kể truy cập. Đơn giản, ngăn stale data.
- ✦ **FIFO**: evict entry được chèn lâu nhất. Đơn giản nhưng bỏ qua access pattern.
- ✦ **Random**: evict entry ngẫu nhiên. Hiệu quả đáng ngạc nhiên ở quy mô lớn.
- ✦ Redis: <code>allkeys-lru</code>, <code>allkeys-lfu</code>, <code>volatile-lru</code>, <code>volatile-ttl</code>.

*Caffeine: LRU+TTL+stats monitoring; Redis: allkeys-lfu vs lru vs volatile-ttl; per-domain policy guide*
```java
// Caffeine (L1 cache): configure eviction policy + stats
@Bean
public Cache<String, Product> productCache() {
    return Caffeine.newBuilder()
        .maximumSize(10_000)                     // LRU eviction when size exceeded
        .expireAfterWrite(30, TimeUnit.MINUTES)  // TTL: absolute expiry after write
        .expireAfterAccess(10, TimeUnit.MINUTES) // TTL: reset on each access (LRU-like)
        .recordStats()                           // enable hit/miss/eviction metrics
        .removalListener((key, value, cause) ->
            log.debug("Evicted from cache: key={} reason={}", key, cause))
        .build();
}

// Monitor in production (expose via Actuator or Micrometer)
@Scheduled(fixedDelay = 60_000)
public void logCacheStats() {
    CacheStats stats = productCache.stats();
    log.info("Cache: hitRate={:.2f}% missRate={:.2f}% evictions={}",
        stats.hitRate() * 100, stats.missRate() * 100, stats.evictionCount());
    // Alert if hitRate < 80% (cache too small or wrong TTL)
}

// Redis eviction policy (redis.conf or AWS ElastiCache parameter group)
// maxmemory 512mb
// maxmemory-policy allkeys-lfu   # LFU: evict least-frequently-used keys
//                                # Best for hot-key workloads (product catalog, popular users)

// Policy comparison:
// allkeys-lru:    evict least-recently-used → good for temporal access patterns
// allkeys-lfu:    evict least-frequently-used → good for hot-key (Pareto distribution)
// volatile-lru:   only evict keys WITH TTL, by LRU → protect keys without TTL
// volatile-ttl:   evict key with shortest TTL first → expire sooner anyway
// allkeys-random: random eviction → not recommended (wastes hot entries)
// noeviction:     reject writes when full (returns error) → use only if OOM is unacceptable

// For order-events domain:
// product catalog → allkeys-lfu (few hot products get 80% traffic)
// user sessions   → volatile-lru (sessions have TTL; evict least-recently-used sessions)
// order cache     → volatile-ttl (short-lived; evict soon-to-expire first)
```

### 💡 Lời khuyên thực tế

Monitor cache hit rate (mục tiêu >90% cho cache thiết kế tốt). Hit rate thấp = eviction policy sai, TTL sai hoặc dữ liệu sai được cache. Dùng `recordStats()` của Caffeine trong dev để tune kích thước và TTL trước khi deploy.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa LRU và LFU eviction là gì?</b></summary>

LRU (Least Recently Used) xóa phần tử đã lâu nhất không được truy cập. LFU (Least Frequently Used) xóa phần tử có tần suất/số lần được truy cập ít nhất trong một khoảng thời gian.
</details>

<details>
<summary><b>Q: Redis quyết định evict gì khi memory đầy thế nào?</b></summary>

Dựa trên cấu hình `maxmemory-policy` (ví dụ: `volatile-lru`, `allkeys-lru`, `noeviction` - ném lỗi oom không xóa). Redis sử dụng thuật toán xấp xỉ (approximated LRU) để tiết kiệm CPU.
</details>

<details>
<summary><b>Q: Metric nào cho biết eviction policy cần điều chỉnh?</b></summary>

Tỷ lệ **Cache Hit Rate** giảm mạnh đồng thời số lượng khoá bị xoá (`evicted_keys`) tăng cao liên tục.
</details>
