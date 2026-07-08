# Resilience4j

**Breadcrumb:** 5. Microservices › Circuit Breaker

> Resilience4j là thư viện fault tolerance nhẹ cho Java cung cấp Circuit Breaker, Retry, Rate Limiter, Bulkhead và TimeLimiter dưới dạng decorator có thể kết hợp.

## Các điểm chính

- ✦ <code>@CircuitBreaker</code>: mở circuit sau ngưỡng failure rate, đóng sau khi chờ.
- ✦ <code>@Retry</code>: retry khi exception với số lần thử và backoff có thể cấu hình.
- ✦ <code>@TimeLimiter</code>: timeout cho async call (bọc <code>CompletableFuture</code>).
- ✦ <code>@Bulkhead</code>: giới hạn concurrent call (semaphore-based hoặc thread-pool-based).
- ✦ <code>@RateLimiter</code>: giới hạn call mỗi khoảng thời gian trong chính service.
- ✦ Metric tích hợp với Micrometer — tự động expose lên Prometheus/Grafana.

*Resilience4j full YAML: Retry (exponential backoff), CircuitBreaker, TimeLimiter, Bulkhead (semaphore + thread-pool), RateLimiter + Java annotations*
```java
# ✅ Resilience4j: full configuration for order-service calling inventory-service
# Decorator execution order (outermost → innermost):
# Bulkhead → TimeLimiter → CircuitBreaker → Retry → RateLimiter → actual call

resilience4j:
  # ── Retry: try again on transient errors ──
  retry:
    instances:
      inventoryService:
        max-attempts: 3                 # 1 original + 2 retries
        wait-duration: 500ms            # wait 500ms between attempts
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2   # 500ms → 1000ms → 2000ms
        retry-exceptions:
          - java.io.IOException
          - feign.FeignException$ServiceUnavailable
        ignore-exceptions:
          - com.example.exception.OutOfStockException  # don't retry business errors

  # ── Circuit Breaker: protect against cascading failure ──
  circuitbreaker:
    instances:
      inventoryService:
        sliding-window-type: COUNT_BASED     # evaluate last N calls
        sliding-window-size: 20              # last 20 calls
        failure-rate-threshold: 50           # OPEN if >50% fail
        slow-call-duration-threshold: 2s     # calls >2s counted as failure
        slow-call-rate-threshold: 80         # OPEN if >80% calls are slow
        wait-duration-in-open-state: 60s     # stay OPEN for 60s
        permitted-number-of-calls-in-half-open-state: 5  # probe with 5 test calls
        minimum-number-of-calls: 10          # need at least 10 calls before tripping

  # ── TimeLimiter: cancel calls that take too long ──
  timelimiter:
    instances:
      inventoryService:
        timeout-duration: 3s                 # cancel if >3 seconds
        cancel-running-future: true

  # ── Bulkhead: limit concurrent calls (semaphore-based) ──
  # Prevents inventory-service from consuming all order-service threads
  bulkhead:
    instances:
      inventoryService:
        max-concurrent-calls: 15            # max 15 simultaneous calls allowed
        max-wait-duration: 500ms            # queue for 500ms; BulkheadFullException if still full

  # ── Thread-pool Bulkhead (alternative): isolates calls in dedicated thread pool ──
  thread-pool-bulkhead:
    instances:
      inventoryService:
        core-thread-pool-size: 5
        max-thread-pool-size: 10
        queue-capacity: 20                  # tasks queue up here before rejection

  # ── RateLimiter: limit calls TO inventory-service (protect downstream) ──
  ratelimiter:
    instances:
      inventoryService:
        limit-for-period: 100               # max 100 calls per period
        limit-refresh-period: 1s            # reset every second
        timeout-duration: 200ms             # wait 200ms for permission

// ✅ Java annotation usage (apply all decorators)
@CircuitBreaker(name = "inventoryService", fallbackMethod = "inventoryFallback")
@TimeLimiter(name = "inventoryService")
@Bulkhead(name = "inventoryService", type = Bulkhead.Type.SEMAPHORE)
@Retry(name = "inventoryService")
public CompletableFuture<ReserveResult> reserveStock(Long orderId, List<OrderItem> items) {
    return CompletableFuture.supplyAsync(() -> inventoryClient.reserve(orderId, items));
}

public CompletableFuture<ReserveResult> inventoryFallback(Long orderId, List<OrderItem> items, Throwable t) {
    log.error("Inventory service unavailable for orderId={}", orderId, t);
    // Degrade gracefully: put reservation in pending queue for async retry
    reservationQueue.enqueue(new PendingReservation(orderId, items));
    return CompletableFuture.completedFuture(ReserveResult.queued(orderId));
}
```

### 💡 Lời khuyên thực tế

Dùng Resilience4j với Spring Cloud OpenFeign cho inter-service call. Áp dụng decorator theo thứ tự: TimeLimiter → CircuitBreaker → Retry → Bulkhead (hoặc dùng @annotation theo thứ tự đó). Điều chỉnh ngưỡng dựa trên SLO quan sát được, không phải giá trị mặc định.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa Resilience4j Bulkhead và Circuit Breaker là gì?</b></summary>

Circuit Breaker ngắt mạch dựa trên **tỷ lệ lỗi hoặc độ trễ** của các cuộc gọi nhằm tránh làm quá tải hệ thống khi đối tác gặp sự cố. Bulkhead giới hạn **số lượng cuộc gọi đồng thời** (concurrent calls) đến một tài nguyên cụ thể để ngăn một service lỗi chiếm dụng toàn bộ tài nguyên (thread pool/semaphore) của ứng dụng.
</details>

<details>
<summary><b>Q: @TimeLimiter hoạt động với CompletableFuture thế nào?</b></summary>

`@TimeLimiter` yêu cầu phương thức được khai báo phải trả về một kiểu bất đồng bộ như `CompletableFuture`. Khi gọi hàm, TimeLimiter sẽ giám sát thời gian chạy; nếu vượt quá ngưỡng thời gian cho phép, nó sẽ chủ động hủy task và ném ra `TimeoutException`.
</details>

<details>
<summary><b>Q: slow-call-rate-threshold trong cấu hình circuit breaker là gì?</b></summary>

Là tỷ lệ phần trăm (ví dụ: 50%) các cuộc gọi có thời gian phản hồi vượt quá ngưỡng trễ định trước (`slowCallDurationThreshold`). Nếu vượt quá tỷ lệ này trong khoảng giám sát, Circuit Breaker sẽ chuyển sang trạng thái `OPEN`.
</details>
