# Scalability

**Breadcrumb:** 7. System Design

> Scalability là khả năng xử lý tải tăng trưởng bằng cách thêm tài nguyên — theo chiều ngang (nhiều node hơn) hoặc chiều dọc (node lớn hơn) — với thiết kế stateless là yếu tố then chốt.

## Các điểm chính

- ✦ **Vertical scaling**: máy lớn hơn (nhiều CPU/RAM hơn). Đơn giản, có giới hạn phần cứng, single point of failure.
- ✦ **Horizontal scaling**: nhiều máy hơn. Cần load balancing và stateless service.
- ✦ **Stateless**: không có server-side session; state trong DB/Redis. Bất kỳ instance nào xử lý bất kỳ request nào.
- ✦ Bottleneck cần xác định: DB (phổ biến nhất), network I/O, CPU-bound processing, memory.
- ✦ Load testing: JMeter, k6, Gatling — tìm nơi hệ thống sụp đổ trước production.

*Scalability: cache layer → stateless session (Spring Session Redis) → HPA auto-scale*
```java
// Scalability: identify bottleneck before scaling
// Typical order: cache → read replica → app horizontal scale → write sharding

// Step 1: Add cache layer (reduces DB read load 90%+)
@Service @RequiredArgsConstructor
public class ProductService {
    private final ProductRepository repo;
    private final RedisTemplate<String, Product> redis;

    public Product getProduct(Long id) {
        String key = "product:" + id;
        Product cached = redis.opsForValue().get(key);
        if (cached != null) return cached;      // cache hit: ~1ms
        Product p = repo.findById(id).orElseThrow(); // DB: ~50ms
        redis.opsForValue().set(key, p, Duration.ofMinutes(30));
        return p;
    }
}

// Step 2: Stateless service — session in Redis (enables horizontal scaling)
// BAD: in-memory session (breaks with 2+ instances)
// HttpSession session = request.getSession();
// session.setAttribute("cart", cart); // only on this instance!

// GOOD: Spring Session Redis (transparent, zero-code change)
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)
@Configuration
public class SessionConfig {}
// All instances share session via Redis — any instance handles any request

// Step 3: Kubernetes HPA — auto-scale based on CPU or custom metric
// apiVersion: autoscaling/v2
// spec:
//   minReplicas: 2          # always at least 2 for HA
//   maxReplicas: 20
//   metrics:
//   - type: Resource
//     resource: { name: cpu, target: { averageUtilization: 70 } }

// Load testing to find bottleneck (k6 example):
// k6 run --vus 100 --duration 30s script.js
// Watch: CPU, DB connection pool, GC pause, response P99 latency
// Bottleneck = first thing that saturates → fix that before scaling app servers
```

### 💡 Lời khuyên thực tế

Trước khi scale horizontally, xác định bottleneck. Thường: thêm DB read replica, thêm caching layer, sau đó scale app server. Stateless service scale dễ dàng — chỉ cần thêm instance đằng sau load balancer.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa horizontal và vertical scaling là gì?</b></summary>

Vertical Scaling (Scale up) là nâng cấp cấu hình phần cứng (CPU, RAM) cho server hiện tại. Horizontal Scaling (Scale out) là bổ sung thêm nhiều server vật lý chạy song song.
</details>

<details>
<summary><b>Q: Tại sao service phải stateless để scale horizontally?</b></summary>

Vì nếu chứa trạng thái (state) nội bộ, các server khác sẽ không có thông tin này khi request của người dùng được phân phối ngẫu nhiên sang, dẫn đến sai lệch dữ liệu logic.
</details>

<details>
<summary><b>Q: Làm thế nào để xác định bottleneck trong hệ thống đang chịu tải?</b></summary>

Sử dụng các công cụ APM giám sát độ trễ, kiểm tra tỷ lệ sử dụng tài nguyên (CPU, Memory, Disk I/O) của Database Server, đo đạc thời gian kết nối của mạng và phân tích logs lỗi.
</details>
