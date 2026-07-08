# Distributed Tracing

**Breadcrumb:** 8. Cloud & DevOps › Monitoring

> Distributed tracing theo dõi request qua nhiều microservice bằng cách truyền trace context, cho phép phân tích nguyên nhân gốc của latency và lỗi trong service graph phức tạp.

## Các điểm chính

- ✦ **Trace**: toàn bộ hành trình request. **Span**: một thao tác (HTTP call, DB query). Span có quan hệ parent-child.
- ✦ Trace context được truyền qua HTTP header: <code>traceparent</code> (chuẩn W3C), hoặc <code>X-B3-TraceId</code> (Zipkin).
- ✦ Tool: Jaeger, Zipkin, AWS X-Ray, OpenTelemetry (protocol chuẩn).
- ✦ Spring: Micrometer Tracing (thay thế Sleuth trong Boot 3). Auto-instrument HTTP và Kafka.
- ✦ Sampling: đừng trace 100% — dùng probabilistic (1-10%) hoặc adaptive sampling.

*Micrometer Tracing với Zipkin và manual span*
```java
# Spring Boot 3 + Micrometer Tracing + Zipkin
# pom.xml:
# spring-boot-starter-actuator
# micrometer-tracing-bridge-brave
# zipkin-reporter-brave

# application.yml
management:
  tracing:
    sampling:
      probability: 0.1  # trace 10% of requests

# Auto-instrumented: RestTemplate, WebClient, @Async, Kafka
# Manual span:
@Autowired Tracer tracer;
Span span = tracer.nextSpan().name("db-query").start();
try (Tracer.SpanInScope ws = tracer.withSpan(span.start())) {
    return repo.findAll();
} catch(Exception e){
    span.error(e); throw e;
} finally { span.end(); }
```

### 💡 Lời khuyên thực tế

Thêm tracing trước khi cần — sau incident thì quá muộn. Sample ở 1-10% trong production để kiểm soát chi phí storage. Dùng trace ID trong log (MDC) để bạn có thể correlate trace ID từ Jaeger với log line trong Loki/Elasticsearch.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa trace và span là gì?</b></summary>

**Trace** đại diện cho toàn bộ hành trình xử lý của một request đi xuyên qua toàn bộ hệ thống microservices. **Span** đại diện cho một đơn vị công việc/xử lý nhỏ nhất nằm trong hành trình đó (ví dụ: một truy vấn SQL, một lời gọi HTTP sang service khác).
</details>

<details>
<summary><b>Q: Trace context được truyền qua HTTP boundary thế nào?</b></summary>

Thông qua việc chèn các trường thông tin chuẩn hóa vào HTTP Headers (phổ biến nhất là chuẩn **W3C Trace Context** với header `traceparent` chứa Trace ID và Span ID).
</details>

<details>
<summary><b>Q: Sampling là gì và tại sao 100% sampling problematic trong production?</b></summary>

Sampling là tỷ lệ chọn lọc lưu trữ lại vết trace (ví dụ chỉ lưu 10% số request). 100% sampling trong production sẽ tạo ra một lượng dữ liệu log khổng lồ gây tốn kém không gian lưu trữ và làm chậm hiệu năng của ứng dụng do chi phí thu thập thông tin lớn.
</details>
