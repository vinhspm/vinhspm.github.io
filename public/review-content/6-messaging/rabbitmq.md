# RabbitMQ

**Breadcrumb:** 6. Messaging

> RabbitMQ là message broker implement AMQP, dùng Exchange để route message đến Queue qua Binding linh hoạt — đơn giản hơn Kafka cho task queue và routing.

## Các điểm chính

- ✦ Core: Producer → **Exchange** → (Binding) → **Queue** → Consumer.
- ✦ Loại Exchange: <code>direct</code> (routing key exact), <code>topic</code> (wildcard), <code>fanout</code> (broadcast), <code>headers</code>.
- ✦ Message push-based: RabbitMQ đẩy đến consumer. Kafka là pull-based.
- ✦ Acknowledgement: <code>basic.ack</code> (đã xử lý), <code>basic.nack</code> (requeue hoặc DLQ).
- ✦ Dead Letter Exchange (DLX): message thất bại đi vào DLX → DLQ để kiểm tra.

*RabbitMQ: topic exchange + DLQ config + publisher + manual-ack consumer*
```java
// RabbitMQ: full config with DLQ for order-events
@Configuration
public class RabbitMQConfig {

    // Main exchange: topic type → flexible routing by event type
    @Bean
    public TopicExchange orderExchange() {
        return ExchangeBuilder.topicExchange("order.exchange").durable(true).build();
    }

    // Dead-letter exchange: receives rejected/expired messages
    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange("order.dlx").durable(true).build();
    }

    // Main queue: bound to DLX so failed messages auto-route to DLQ
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-dead-letter-exchange", "order.dlx")
            .withArgument("x-dead-letter-routing-key", "order.dead")
            .withArgument("x-message-ttl", 30_000)   // 30s TTL before → DLQ
            .build();
    }

    // DLQ: stores failed messages for investigation and replay
    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable("order.dlq").build();
    }

    @Bean public Binding orderBinding() {
        return BindingBuilder.bind(orderQueue()).to(orderExchange()).with("order.#");
    }
    @Bean public Binding dlqBinding() {
        return BindingBuilder.bind(deadLetterQueue()).to(deadLetterExchange()).with("order.dead");
    }
}

// Publisher: send order-created event
@Service @RequiredArgsConstructor
public class OrderEventPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void publishOrderCreated(OrderCreatedEvent event) {
        rabbitTemplate.convertAndSend("order.exchange", "order.created", event,
            msg -> { msg.getMessageProperties().setContentType("application/json"); return msg; });
        log.info("Published order.created for orderId={}", event.getOrderId());
    }
}

// Consumer: manual ack with nack→DLQ on failure
@RabbitListener(queues = "order.queue")
public void onOrderCreated(OrderCreatedEvent event, Channel channel,
        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
    try {
        orderService.process(event);
        channel.basicAck(deliveryTag, false);          // success: ack
    } catch (NonRecoverableException e) {
        channel.basicNack(deliveryTag, false, false);  // failure: nack → DLQ (requeue=false)
    }
}
```

### 💡 Lời khuyên thực tế

Dùng RabbitMQ cho: task queue, request-reply pattern, routing phức tạp theo type/attribute, throughput nhỏ-vừa. Dùng Kafka cho: event streaming, audit log, replay, cross-team event bus, throughput cao.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa Kafka topic và RabbitMQ queue là gì?</b></summary>

Kafka topic là file log tuần tự, dữ liệu ghi vào không bị xóa đi khi consumer đọc xong. RabbitMQ queue là hàng đợi chứa các con trỏ tin nhắn, tin nhắn sẽ bị xóa ngay khỏi hàng đợi sau khi consumer phản hồi (ack) thành công.
</details>

<details>
<summary><b>Q: Các loại RabbitMQ exchange và khi nào dùng mỗi loại?</b></summary>

Fanout: Phát quảng bá cho tất cả. Direct: So khớp chính xác routing key. Topic: So khớp theo pattern wildcard. Headers: Khớp dựa trên các thuộc tính của headers.
</details>

<details>
<summary><b>Q: RabbitMQ xử lý message chưa được acknowledged thế nào?</b></summary>

Khi channel/connection của consumer bị ngắt, RabbitMQ sẽ tự động hoàn trả (requeue) tin nhắn chưa được ack đó lại hàng đợi để gửi cho consumer khác xử lý.
</details>
