# API Gateway

**Breadcrumb:** 5. Microservices

> API Gateway là điểm vào duy nhất cho tất cả client request, xử lý routing, auth, rate limiting, SSL termination và request transformation trước khi chuyển tiếp đến backend service.

## Các điểm chính

- ✦ Ẩn service topology nội bộ khỏi client.
- ✦ Tập trung: authentication, rate limiting, CORS, logging, SSL termination.
- ✦ Tùy chọn: Spring Cloud Gateway, Kong, AWS API Gateway, Nginx, Traefik.
- ✦ Pattern BFF (Backend for Frontend): gateway riêng cho từng loại client (mobile vs web).
- ✦ Có thể aggregate nhiều service call thành một response (aggregation/composition).

*Spring Cloud Gateway: multi-route config, JWT GlobalFilter, rate limiter, circuit breaker, retry*
```java
// ✅ Spring Cloud Gateway: central entry point for all client traffic
// Responsibilities: routing, JWT auth, rate limiting, CORS, request/response logging

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder b) {
        return b.routes()

            // ── Order Service: authenticated + rate limited ──
            .route("order-service", r -> r
                .path("/api/orders/**")
                .and().header("Authorization")          // only route if Authorization header present
                .filters(f -> f
                    .addRequestHeader("X-Gateway-Version", "1.0")   // tag requests from gateway
                    .addRequestHeader("X-Forwarded-For",             // pass client IP downstream
                        "#{T(reactor.core.publisher.Mono).just(exchange.getRequest().getRemoteAddress())}")
                    .requestRateLimiter(c -> c           // rate limit per user
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                    .circuitBreaker(c -> c               // circuit breaker: fallback to /fallback
                        .setName("orderCB")
                        .setFallbackUri("forward:/fallback/orders"))
                    .retry(retryConfig -> retryConfig    // retry 2x on 503
                        .setRetries(2)
                        .setStatuses(HttpStatus.SERVICE_UNAVAILABLE))
                )
                .uri("lb://order-service")              // lb:// → Spring Cloud LoadBalancer
            )

            // ── User Service: public auth endpoints (no auth required) ──
            .route("user-auth", r -> r
                .path("/api/users/login", "/api/users/register")
                .filters(f -> f.stripPrefix(0))         // keep path as-is
                .uri("lb://user-service")
            )

            // ── Payment Service: strict rate limit, auth required ──
            .route("payment-service", r -> r
                .path("/api/payments/**")
                .filters(f -> f
                    .requestRateLimiter(c -> c
                        .setRateLimiter(new RedisRateLimiter(5, 10, 1))  // 5 req/sec, burst 10
                        .setKeyResolver(apiKeyResolver())))
                .uri("lb://payment-service")
            )
            .build();
    }

    // Rate limit key: resolve per authenticated user ID from JWT
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> Mono.justOrEmpty(
            exchange.getRequest().getHeaders().getFirst("X-User-Id")
        ).defaultIfEmpty("anonymous");
    }

    // Rate limit key: resolve per API key header
    @Bean
    public KeyResolver apiKeyResolver() {
        return exchange -> Mono.justOrEmpty(
            exchange.getRequest().getHeaders().getFirst("X-API-Key")
        ).defaultIfEmpty("no-key");
    }
}

// ✅ Global JWT filter: validate token before any route is reached
@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String auth = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        // Validate JWT, extract claims, forward userId in header to downstream
        Claims claims = jwtUtil.parse(auth.substring(7));
        ServerHttpRequest mutated = exchange.getRequest().mutate()
            .header("X-User-Id", claims.getSubject())
            .build();
        return chain.filter(exchange.mutate().request(mutated).build());
    }

    @Override public int getOrder() { return -1; }  // run before other filters
}
```

### 💡 Lời khuyên thực tế

Đặt JWT validation ở cấp gateway để backend service nhận request đã được xác thực. Đừng đặt business logic trong gateway — nó nên là lớp routing/filtering mỏng. Cho microservice composition phức tạp, xem xét GraphQL tại gateway.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa API Gateway và load balancer là gì?</b></summary>

Load balancer chỉ phân phối traffic (ở Layer 4 hoặc Layer 7) đến các instance của một service để tăng độ tải. API Gateway hoạt động ở mức ứng dụng (Layer 7), đóng vai trò như một điểm đầu vào duy nhất cung cấp thêm các tính năng nâng cao như routing phức tạp, authentication/authorization, rate limiting, logging, và gom/biến đổi API.
</details>

<details>
<summary><b>Q: Pattern Backend for Frontend (BFF) là gì?</b></summary>

BFF là pattern tạo ra các API Gateway riêng biệt cho từng loại client cụ thể (ví dụ: Mobile BFF, Web BFF, Third-party BFF) giúp tùy biến dữ liệu trả về tối ưu nhất cho từng thiết bị mà không làm phình to một API Gateway dùng chung.
</details>

<details>
<summary><b>Q: Gateway xử lý authentication vs authorization thế nào?</b></summary>

Gateway thường đảm nhận việc xác thực (**Authentication**) tập trung (kiểm tra tính hợp lệ của JWT/OAuth token) rồi chèn thông tin User đã xác thực vào request header gửi xuống các service nội bộ. Việc phân quyền (**Authorization** chi tiết ở mức tài nguyên cụ thể) thường được đẩy xuống từng service nội bộ tự xử lý dựa trên thông tin User nhận từ Gateway.
</details>
