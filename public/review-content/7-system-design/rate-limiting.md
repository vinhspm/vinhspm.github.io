# Rate Limiting

**Breadcrumb:** 7. System Design

> Rate limiting kiểm soát tần suất request từ client, bảo vệ service khỏi quá tải, lạm dụng và đảm bảo phân phối tài nguyên công bằng.

## Các điểm chính

- ✦ Áp dụng tại: API Gateway (mỗi client/route), service layer, hoặc Nginx (<code>limit_req</code>).
- ✦ **Token Bucket**: token được thêm với tốc độ cố định; mỗi request tiêu thụ một token. Cho phép bursting.
- ✦ **Sliding Window**: đếm request trong rolling time window. Mượt, không có lợi thế burst.
- ✦ **Fixed Window**: đếm mỗi phút/giờ cố định. Đơn giản nhưng edge-case: tốc độ 2× tại ranh giới window.
- ✦ Key: theo IP, user ID, API key hoặc kết hợp.
- ✦ Response: HTTP 429 với <code>Retry-After</code> và header <code>X-RateLimit-*</code>.

*Bucket4j token bucket per user; 429 response + headers; Spring Cloud Gateway Redis rate limiter*
```java
// Token Bucket rate limiting with Bucket4j (in-process)
@Service @RequiredArgsConstructor
public class RateLimiterService {
    // ConcurrentHashMap: one bucket per user (in-memory — use Redis for distributed)
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    // Create bucket: 100 req/min with burst up to 200
    private Bucket createBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder()
                .capacity(200)                           // max burst size
                .refillGreedy(100, Duration.ofMinutes(1)) // refill 100 tokens/min
                .build())
            .build();
    }

    public boolean tryConsume(String userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, k -> createBucket());
        return bucket.tryConsume(1); // consume 1 token; false if bucket empty
    }
}

// Rate limiting filter applied to all API endpoints
@Component @RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {
    private final RateLimiterService rateLimiter;

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String userId = req.getHeader("X-User-Id");
        if (userId != null && !rateLimiter.tryConsume(userId)) {
            resp.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // 429
            resp.setHeader("Retry-After", "60");
            resp.setHeader("X-RateLimit-Limit", "100");
            resp.getWriter().write("{"error":"Rate limit exceeded"}");
            return;
        }
        chain.doFilter(req, resp);
    }
}

// Distributed rate limiting: Spring Cloud Gateway + Redis (preferred for microservices)
// application.yml:
// spring:
//   cloud:
//     gateway:
//       routes:
//         - id: order-service
//           uri: lb://order-service
//           predicates:
//             - Path=/api/orders/**
//           filters:
//             - name: RequestRateLimiter
//               args:
//                 redis-rate-limiter.replenishRate: 10     # tokens/second
//                 redis-rate-limiter.burstCapacity: 50     # max burst
//                 redis-rate-limiter.requestedTokens: 1
//                 key-resolver: "#{@userKeyResolver}"      # rate limit per user

// KeyResolver bean: extract user ID from JWT header
// @Bean KeyResolver userKeyResolver() {
//     return exchange -> Mono.just(
//         exchange.getRequest().getHeaders().getFirst("X-User-Id"));
// }
```

### 💡 Lời khuyên thực tế

Cho distributed rate limiting qua các instance, back token bucket bằng Redis (Bucket4j-Redis). Cho API Gateway-level limiting, dùng `RedisRateLimiter` tích hợp của Spring Cloud Gateway. Luôn bao gồm rate limit header trong response để client tự điều chỉnh.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa token bucket và fixed window rate limiting là gì?
- **Q:** Làm thế nào để implement rate limiting hoạt động qua nhiều service instance?
- **Q:** HTTP status code và header nào một response bị rate-limited nên bao gồm?
