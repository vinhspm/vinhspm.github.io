# Write-Through & Write-Behind

**Breadcrumb:** 7. System Design › Caching

> Write-Through cập nhật cache và DB đồng bộ trên mỗi lần ghi (strong consistency); Write-Behind (Write-Back) cập nhật cache ngay lập tức, DB bất đồng bộ (throughput cao hơn, nguy cơ mất dữ liệu).

## Các điểm chính

- ✦ **Write-Through**: ghi vào cache và DB atomic. Cache luôn nhất quán với DB. Write latency cao hơn.
- ✦ **Write-Behind**: ghi vào cache, queue DB write bất đồng bộ. Write latency thấp, throughput cao. Rủi ro: mất dữ liệu nếu cache chết trước khi ghi DB.
- ✦ **Write-Around**: ghi trực tiếp vào DB, bypass cache. Cache được cập nhật trên lần đọc tiếp theo. Tốt cho dữ liệu write-once.
- ✦ Write-Through tốt nhất cho: dữ liệu tài chính, consistency quan trọng. Write-Behind: analytics ghi cao, counter.

*Write-Through: DB+cache atomic update; @CachePut; Write-Behind: view counter async flush với risk*
```java
// Write-Through: update DB and cache in same operation → strong consistency
@Service @RequiredArgsConstructor
public class UserProfileService {
    private final UserRepository userRepo;
    private final RedisTemplate<String, UserProfile> redis;

    @Transactional
    public UserProfile updateProfile(String userId, UpdateProfileRequest req) {
        UserProfile profile = userRepo.findById(userId).orElseThrow();
        profile.applyUpdate(req);
        UserProfile saved = userRepo.save(profile);         // 1. write to DB
        redis.opsForValue().set("user:" + userId, saved,    // 2. write to cache (same call)
            Duration.ofHours(1));
        return saved; // cache is always consistent with DB
    }
}

// Spring @CachePut = Write-Through declaratively
@CachePut(value = "products", key = "#result.id")  // updates cache on every write
public Product updateProduct(Product product) {
    return productRepo.save(product); // DB write; return value goes into cache
}

// Write-Behind (Write-Back): update cache immediately, persist to DB asynchronously
// Use case: view counters, like counts, real-time analytics — high-frequency writes
@Service @RequiredArgsConstructor
public class ViewCounterService {
    private final RedisTemplate<String, Long> redis;
    private final AsyncProductRepository asyncRepo;

    public long incrementViews(Long productId) {
        String key = "views:product:" + productId;
        Long count = redis.opsForValue().increment(key); // immediate, ~1ms
        // Flush to DB asynchronously every 60 seconds via scheduled job
        return count;
    }

    @Scheduled(fixedDelay = 60_000)
    public void flushViewCounts() {
        // Read all view counts from Redis, batch update to DB
        Set<String> keys = redis.keys("views:product:*");
        if (keys == null) return;
        keys.forEach(key -> {
            Long count = redis.opsForValue().get(key);
            Long productId = Long.parseLong(key.replace("views:product:", ""));
            asyncRepo.updateViewCount(productId, count);   // batch DB update
            redis.delete(key);
        });
    }
}
// Write-Behind risk: if Redis crashes before flush → view count data lost
// Mitigation: Redis AOF persistence + regular flush intervals
```

### 💡 Lời khuyên thực tế

Mặc định Write-Through cho hầu hết Spring app dùng `@CachePut`. Dùng Write-Behind cho counter hoặc tổng hợp metric throughput cao nơi vài giây delay chấp nhận được và mất dữ liệu đôi khi chấp nhận được.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Rủi ro của Write-Behind caching là gì?</b></summary>

Nguy cơ mất mát dữ liệu cao nếu node cache (Redis) bị sập đột ngột trước khi dữ liệu kịp được đồng bộ ghi xuống Database gốc.
</details>

<details>
<summary><b>Q: Khi nào bạn dùng Write-Around thay vì Write-Through?</b></summary>

Khi dữ liệu được ghi mới rất ít khi được đọc lại ngay lập tức (Write-Around ghi trực tiếp xuống DB, tránh làm bẩn/quá tải bộ nhớ cache vô ích).
</details>

<details>
<summary><b>Q: Làm thế nào để duy trì consistency giữa cache và DB trong Write-Through?</b></summary>

Ứng dụng luôn ghi dữ liệu vào cache trước, và chính cache engine sẽ chịu trách nhiệm đồng bộ ghi xuống DB ngay trong cùng một giao dịch (transaction) trước khi trả về kết quả thành công cho client.
</details>
