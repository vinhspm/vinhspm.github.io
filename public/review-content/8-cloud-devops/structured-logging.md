# Structured Logging

**Breadcrumb:** 8. Cloud & DevOps › Monitoring

> Structured logging xuất log entry dưới dạng JSON (hoặc key-value pair) thay vì plain text, làm log có thể parse bằng máy và cho phép filter và aggregate mạnh mẽ trong hệ thống log.

## Các điểm chính

- ✦ JSON log: mỗi field có thể query trong ELK/Loki (<code>log.level = "ERROR" AND service = "order-service"</code>).
- ✦ Field chuẩn: timestamp, level, service, traceId, spanId, userId, message.
- ✦ MDC (Mapped Diagnostic Context): key-value pair thread-local được thêm vào mọi log line.
- ✦ Tránh log dữ liệu nhạy cảm: password, số thẻ tín dụng, PII (tuân thủ GDPR).
- ✦ Log level: ERROR (cần hành động), WARN (điều tra), INFO (vận hành), DEBUG (chỉ development).

*Logback JSON config + MDC filter + log correlation với traceId*
```xml
<!-- logback-spring.xml: JSON output via logstash-logback-encoder -->
<configuration>
  <springProfile name="!local">
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <!-- include MDC fields in every log entry -->
        <includeMdcKeyName>traceId</includeMdcKeyName>
        <includeMdcKeyName>spanId</includeMdcKeyName>
        <includeMdcKeyName>requestId</includeMdcKeyName>
        <includeMdcKeyName>userId</includeMdcKeyName>
        <includeMdcKeyName>orderId</includeMdcKeyName>
        <!-- mask sensitive fields -->
        <fieldNames>
          <timestamp>@timestamp</timestamp>
          <message>message</message>
        </fieldNames>
      </encoder>
    </appender>
    <root level="INFO"><appender-ref ref="JSON"/></root>
  </springProfile>
  <!-- local: human-readable pattern -->
  <springProfile name="local">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder><pattern>%d{HH:mm:ss} [%X{traceId}] %-5level %logger{36} - %msg%n</pattern></encoder>
    </appender>
    <root level="DEBUG"><appender-ref ref="CONSOLE"/></root>
  </springProfile>
</configuration>

// ── MDC Filter: inject correlation IDs into every request ───────────────────
@Component @Order(1)
public class MdcLoggingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws IOException, ServletException {
        // Propagate trace ID from upstream (e.g. API Gateway, Zipkin)
        String traceId = Optional.ofNullable(req.getHeader("X-B3-TraceId"))
                                 .orElse(UUID.randomUUID().toString().replace("-",""));
        MDC.put("traceId",   traceId);
        MDC.put("spanId",    UUID.randomUUID().toString().substring(0,16));
        MDC.put("requestId", UUID.randomUUID().toString());
        MDC.put("userId",    extractUserId(req));   // from JWT claim
        MDC.put("path",      req.getRequestURI());
        res.setHeader("X-Trace-Id", traceId);      // return to client for debugging
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();  // IMPORTANT: clear to avoid thread pool contamination
        }
    }
}

// ── Service layer: log with business context ─────────────────────────────────
@Service @Slf4j
public class OrderService {
    public Order placeOrder(OrderRequest req) {
        MDC.put("orderId", req.getOrderId());  // add order-specific context
        log.info("Placing order for user={} items={}", req.getUserId(), req.getItemCount());
        try {
            Order order = processOrder(req);
            // JSON output: {"@timestamp":"...","level":"INFO","traceId":"abc123",
            //   "requestId":"def456","userId":"u1","orderId":"o99","message":"Order placed"}
            log.info("Order placed successfully status={} total={}", order.getStatus(), order.getTotal());
            return order;
        } catch (PaymentDeclinedException e) {
            log.warn("Payment declined reason={} amount={}", e.getReason(), req.getTotal());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error placing order", e);  // stack trace included in JSON
            throw e;
        } finally {
            MDC.remove("orderId");
        }
    }
}
```

### 💡 Lời khuyên thực tế

Chuyển từ pattern-based logging sang JSON với `logstash-logback-encoder`. Điều này làm log có thể tìm kiếm trong Kibana hoặc Loki không cần regex parsing. Thêm trace ID vào MDC khi vào request để bạn có thể tìm tất cả log cho một request trong một query.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Structured logging là gì và tại sao tốt hơn plain text log?</b></summary>

Là định dạng log ghi dữ liệu dưới dạng cấu trúc có tổ chức (như JSON) thay vì một dòng text tự do. Tốt hơn vì máy tính dễ dàng phân tích, lọc, tìm kiếm và lập chỉ mục (index) log tự động trên các công cụ như ELK/Loki.
</details>

<details>
<summary><b>Q: MDC giúp gì với correlating log qua một request?</b></summary>

Mapped Diagnostic Context giúp lưu trữ các thông tin ngữ cảnh (như Correlation ID/User ID) vào ThreadLocal. Mọi dòng log được in ra từ luồng (thread) đó sẽ tự động được gán kèm ID này, giúp liên kết toàn bộ hành trình xử lý request trong log.
</details>

<details>
<summary><b>Q: Mỗi log entry nên bao gồm những field nào?</b></summary>

timestamp (định dạng ISO 8601), log_level (INFO/ERROR), thread_name, logger_name, message, correlation_id, service_name, và exception_stacktrace (nếu có lỗi).
</details>
