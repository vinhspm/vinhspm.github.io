# Monitoring & Observability

**Breadcrumb:** 8. Cloud & DevOps

> Observability cung cấp insight vào distributed system qua ba trụ cột: Metric (cái gì), Log (tại sao) và Trace (ở đâu) — cho phép phát hiện incident nhanh và phân tích nguyên nhân gốc.

## Các điểm chính

- ✦ **Metric**: số time-series (request rate, error rate, latency, saturation). Tool: Prometheus + Grafana.
- ✦ **Log**: bản ghi event với context. Structured JSON log. Tool: ELK Stack, Loki + Grafana.
- ✦ **Trace**: đường dẫn request end-to-end qua service. Tool: Jaeger, Zipkin, AWS X-Ray.
- ✦ Golden Signal (Google SRE): Latency, Traffic, Error, Saturation (LTES).
- ✦ SLI/SLO/SLA: định nghĩa mục tiêu chất lượng service có thể đo lường và cảnh báo trước khi vi phạm SLO.

*Micrometer custom business metric*
```java
// Spring Boot + Micrometer + Prometheus
@Bean
MeterRegistryCustomizer<PrometheusMeterRegistry> metricsConfig(){
    return r -> r.config().commonTags("service","order-service","env","prod");
}

// Custom business metrics
@Autowired MeterRegistry registry;
void processOrder(Order o){
    registry.counter("orders.processed",
        "status", o.getStatus(),
        "region", o.getRegion()
    ).increment();

    registry.timer("order.processing.time")
        .record(Duration.ofMillis(processingTime));
}

// Exposed at: GET /actuator/prometheus
// Scraped by Prometheus every 15s
```

### 💡 Lời khuyên thực tế

Bắt đầu với phương pháp RED: Request Rate, Error Rate, Duration. Thêm business metric (order/phút, payment success rate) bên cạnh technical metric. Đặt SLO (ví dụ latency p99 < 500ms, error rate < 0.1%) và cảnh báo trước khi vi phạm.

### ❓ Câu hỏi phỏng vấn

- **Q:** Ba trụ cột của observability là gì?
- **Q:** Bốn Golden Signal của Google là gì?
- **Q:** Micrometer tích hợp với Prometheus thế nào?
