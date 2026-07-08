# Dead Letter Queue (DLQ)

**Breadcrumb:** 6. Messaging › Common Concepts

> DLQ bắt message không thể xử lý thành công (lỗi lặp lại, TTL hết hạn, bị reject), cho phép kiểm tra, debug và replay mà không mất dữ liệu.

## Các điểm chính

- ✦ Message vào DLQ khi: bị reject với <code>requeue=false</code>, TTL hết hạn, queue max-length vượt quá.
- ✦ DLQ là queue thông thường với routing đặc biệt từ Dead Letter Exchange (DLX).
- ✦ Mỗi queue gốc trỏ đến DLX; DLX route đến DLQ.
- ✦ Kafka: cấu hình <code>@KafkaListener</code> với <code>DeadLetterPublishingRecoverer</code> — gửi đến <code>&lt;topic&gt;.DLT</code> sau max retry.
- ✦ Luôn monitor kích thước DLQ — DLQ tăng nghĩa là lỗi xử lý tái diễn.

*Kafka DLQ: consumer với NonRetryable→DLT, DLQ monitor + alert, errorHandler config*
```java
// Kafka DLQ pattern with Spring Kafka
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {
    private final OrderService orderService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "order-events", groupId = "order-service",
                   containerFactory = "retryableKafkaListenerContainerFactory")
    public void handleOrderEvent(OrderCreatedEvent event, Acknowledgment ack) {
        try {
            orderService.processOrder(event);
            ack.acknowledge(); // manual ack only on success
        } catch (NonRetryableException e) {
            // Send directly to DLQ — no retry (e.g., validation error, bad data)
            kafkaTemplate.send("order-events.DLT", event.getOrderId(), event);
            ack.acknowledge(); // ack to prevent infinite loop
        }
        // RetryableException (e.g., DB timeout) → framework retries with backoff
    }
}

// DLQ consumer: monitor, alert, and replay after fix
@KafkaListener(topics = "order-events.DLT", groupId = "dlq-monitor")
public void handleDLQ(OrderCreatedEvent event,
        @Header Map<String, Object> headers) {
    String failReason = (String) headers.get("kafka_dlt_exception-message");
    String failClass  = (String) headers.get("kafka_dlt_exception-fqcn");
    log.error("DLQ event: orderId={} reason={} exceptionClass={}",
        event.getOrderId(), failReason, failClass);
    alertService.notifyDLQ("order-events", event.getOrderId(), failReason);
    // After fixing the bug: replay with kafka-consumer-groups --reset-offsets
}

// Spring Kafka: configure retry + DLQ publisher
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<?, ?> tpl) {
    DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(tpl,
        (rec, ex) -> new TopicPartition(rec.topic() + ".DLT", rec.partition()));
    ExponentialBackOffWithMaxRetries backoff = new ExponentialBackOffWithMaxRetries(3);
    backoff.setInitialInterval(1_000L); // 1s → 2s → 4s
    backoff.setMultiplier(2.0);
    DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backoff);
    handler.addNotRetryableExceptions(ValidationException.class, DeserializationException.class);
    return handler;
}

// RabbitMQ DLQ: queue config with x-dead-letter-exchange
// @Bean Queue mainQueue() { return QueueBuilder.durable("order.queue")
//     .withArgument("x-dead-letter-exchange", "order.dlx").build(); }
```

### 💡 Lời khuyên thực tế

Luôn cấu hình DLQ trong production. Đặt alert khi kích thước DLQ > 0. Xây dựng cơ chế replay (đọc từ DLQ, publish lại vào queue gốc sau khi sửa bug). Đừng bao giờ âm thầm bỏ qua message thất bại.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Nguyên nhân nào khiến message vào DLQ?</b></summary>

Do lỗi định dạng dữ liệu (malformed/deserialization error), lỗi nghiệp vụ (business validation fail), hoặc lỗi hệ thống tạm thời liên tục thất bại vượt quá số lần retry tối đa.
</details>

<details>
<summary><b>Q: Làm thế nào để replay message từ DLQ?</b></summary>

Viết một tool/job hoặc dùng console consumer để đọc các tin nhắn trong DLQ, sửa đổi payload (nếu lỗi do dữ liệu), rồi đẩy ngược lại vào Exchange/Topic ban đầu để xử lý lại.
</details>

<details>
<summary><b>Q: Monitoring nào bạn nên đặt cho DLQ?</b></summary>

Cần giám sát **kích thước/số lượng message** trong DLQ (alert ngay khi số lượng > 0) và tốc độ tăng trưởng của DLQ để phát hiện lỗi hệ thống diện rộng kịp thời.
</details>
