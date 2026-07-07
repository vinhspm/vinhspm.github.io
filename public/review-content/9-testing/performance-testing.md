# Performance Testing

**Breadcrumb:** 9. Testing

> Performance testing kiểm tra yêu cầu latency và throughput dưới tải, dùng tool như k6, Gatling hoặc JMeter để tìm bottleneck trước khi production traffic làm điều đó.

## Các điểm chính

- ✦ **Load test**: tải production kỳ vọng — verify SLO được đáp ứng.
- ✦ **Stress test**: vượt quá tải kỳ vọng — tìm điểm gãy.
- ✦ **Spike test**: đột biến đột ngột — test auto-scaling và queue behavior.
- ✦ **Soak test**: tải duy trì trong giờ đồng hồ — tìm memory leak, degradation dần dần.
- ✦ Metric chính: latency p50/p95/p99, throughput (req/s), error rate, saturation.

*Gatling simulation: browse → place order → verify, với ramp/spike load profile và assertions*
```java
// ── Gatling simulation: order checkout flow ──────────────────────────────────
// OrderCheckoutSimulation.scala
class OrderCheckoutSimulation extends Simulation {

  val httpConf = http
    .baseUrl("https://staging-api.example.com")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer ${token}")

  // Feeder: parameterize with different users from CSV
  val users = csv("users.csv").circular   // columns: userId, token

  val checkoutScenario = scenario("Order Checkout Flow")
    .feed(users)
    .exec(
      http("GET /api/products — browse catalog")
        .get("/api/products?category=electronics&limit=20")
        .check(status.is(200))
        .check(jsonPath("$.items[0].productId").saveAs("productId"))
    )
    .pause(1, 3)   // think time: 1-3 seconds between steps
    .exec(
      http("POST /api/orders — place order")
        .post("/api/orders")
        .body(StringBody(
          """{"userId":"${userId}","items":[{"productId":"${productId}","quantity":1}]}"""
        ))
        .check(status.is(201))
        .check(jsonPath("$.orderId").saveAs("orderId"))
    )
    .pause(500.milliseconds)
    .exec(
      http("GET /api/orders/{id} — verify order")
        .get("/api/orders/${orderId}")
        .check(status.is(200))
        .check(jsonPath("$.status").is("CONFIRMED"))
    )

  // Load profile: ramp up → sustain → spike → ramp down
  setUp(
    checkoutScenario.inject(
      rampUsers(50).during(2.minutes),     // ramp up to 50 users
      constantUsersPerSec(50).during(5.minutes),  // sustain load
      atOnceUsers(200),                    // spike: sudden 200 users
      rampUsersPerSec(200).to(0).during(2.minutes)  // ramp down
    )
  ).protocols(httpConf)
   .assertions(
     global.responseTime.percentile(95).lt(500),  // p95 < 500ms
     global.failedRequests.percent.lt(1),         // error rate < 1%
     forAll.responseTime.percentile(99).lt(2000)  // p99 < 2s
   )
}
// Run: mvn gatling:test -Dgatling.simulationClass=OrderCheckoutSimulation
// Report: target/gatling/orderchechoutsimulation-*/index.html
```

### 💡 Lời khuyên thực tế

Định nghĩa threshold như tiêu chí CI pass/fail dựa trên SLO. Chạy với staging trước mỗi release để bắt performance regression. k6 là lựa chọn hiện đại — JavaScript DSL, Go runtime (hiệu quả), tích hợp CI tốt.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa load test và stress test?
- **Q:** Percentile nào (p50/p95/p99) quan trọng nhất cho user experience?
- **Q:** Làm thế nào để tích hợp performance test vào CI/CD?
