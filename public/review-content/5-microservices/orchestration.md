# Orchestration Saga

**Breadcrumb:** 5. Microservices › Saga Pattern

> Trong orchestration, saga coordinator trung tâm (orchestrator) điều khiển distributed transaction, gọi rõ ràng từng participant và xử lý compensation khi thất bại.

## Các điểm chính

- ✦ Orchestrator giữ toàn bộ state machine saga — explicit, auditable, testable.
- ✦ Công cụ: Temporal, Camunda, AWS Step Functions, Conductor (Netflix).
- ✦ Participant là service đơn giản làm theo lệnh orchestrator.
- ✦ **Ưu**: visibility flow tập trung, quản lý compensation phức tạp dễ hơn, một nơi để thêm retry.
- ✦ **Nhược**: orchestrator có thể trở thành bottleneck/single point of failure.

*Temporal Orchestration: 3-step saga, per-step ActivityOptions, reverse compensation, @SignalMethod cancel, idempotent workflowId*
```java
// ✅ Orchestration Saga: central orchestrator drives the entire order flow
// The workflow is the "brain": it calls each service and handles compensation
//
// Happy path:
//   Step 1: Reserve inventory  → Step 2: Charge payment → Step 3: Schedule shipping → DONE
// Compensation (reverse order):
//   Payment fails → release reservation
//   Shipping fails → refund payment + release reservation

@WorkflowInterface
public interface OrderFulfillmentWorkflow {
    @WorkflowMethod
    OrderResult processOrder(OrderRequest request);

    @SignalMethod
    void cancelOrder(String reason);  // signal from external system to abort
}

@WorkflowImpl
public class OrderFulfillmentWorkflowImpl implements OrderFulfillmentWorkflow {

    // Each activity stub has independent timeout + retry config
    private final InventoryActivity inventory = Workflow.newActivityStub(
        InventoryActivity.class,
        ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(10))
            .setRetryOptions(RetryOptions.newBuilder()
                .setMaximumAttempts(3)
                .setDoNotRetry(OutOfStockException.class.getName())  // no retry for business error
                .build())
            .build());

    private final PaymentActivity payment = Workflow.newActivityStub(
        PaymentActivity.class,
        ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(30))
            .setRetryOptions(RetryOptions.newBuilder().setMaximumAttempts(2).build())
            .build());

    private volatile boolean cancelled = false;

    @Override
    public OrderResult processOrder(OrderRequest req) {
        String reservationId = null;
        String transactionId  = null;
        try {
            // Step 1: Reserve stock — Temporal auto-retries transient failures
            reservationId = inventory.reserve(req.getOrderId(), req.getItems());

            if (cancelled) {
                inventory.release(reservationId);   // compensate before abort
                return OrderResult.cancelled(req.getOrderId());
            }

            // Step 2: Charge customer — if this fails, compensate Step 1
            transactionId = payment.charge(req.getCustomerId(), req.getTotal(), req.getOrderId());

            // Step 3: Schedule shipping
            ShippingActivity shipping = Workflow.newActivityStub(ShippingActivity.class,
                ActivityOptions.newBuilder().setStartToCloseTimeout(Duration.ofMinutes(5)).build());
            String tracking = shipping.schedule(req.getOrderId(), req.getShippingAddress());

            return OrderResult.success(req.getOrderId(), transactionId, tracking);

        } catch (OutOfStockException e) {
            return OrderResult.failed(req.getOrderId(), "Out of stock: " + e.getMessage());
        } catch (PaymentDeclinedException e) {
            if (reservationId != null) inventory.release(reservationId);  // compensate Step 1
            return OrderResult.failed(req.getOrderId(), "Payment declined");
        } catch (Exception e) {
            if (transactionId != null) payment.refund(transactionId, req.getTotal());  // comp Step 2
            if (reservationId != null) inventory.release(reservationId);              // comp Step 1
            throw ApplicationFailure.newFailure("Order failed", "OrderError", e);
        }
    }

    @Override
    public void cancelOrder(String reason) { this.cancelled = true; }
}

// ✅ Launch workflow — idempotent: same workflowId = reuse existing, no duplicate
WorkflowOptions opts = WorkflowOptions.newBuilder()
    .setWorkflowId("order-" + req.getOrderId())   // stable ID prevents duplicates
    .setTaskQueue("order-fulfillment-queue")
    .setWorkflowExecutionTimeout(Duration.ofMinutes(10))
    .build();
OrderFulfillmentWorkflow wf = client.newWorkflowStub(OrderFulfillmentWorkflow.class, opts);
OrderResult result = wf.processOrder(req);
// Temporal persists each activity result to DB
// Server crash mid-workflow → Temporal replays history to resume from last completed step
```

### 💡 Lời khuyên thực tế

Dùng Temporal cho workflow chạy lâu cần durability, retry và visibility. Temporal lưu trữ workflow state vào database — tồn tại sau khi server restart. Tốt cho: xử lý đơn hàng, phê duyệt vay vốn, pipeline onboarding.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Vai trò của orchestrator trong orchestration saga là gì?</b></summary>

Đóng vai trò là bộ não điều phối tập trung (Central Coordinator), chịu trách nhiệm định nghĩa luồng xử lý, gửi lệnh thực thi đến các service tham gia, nhận phản hồi và quyết định kích hoạt các compensating transaction (giao dịch bù) để hoàn tác nếu có bước bị lỗi.
</details>

<details>
<summary><b>Q: Temporal khác message queue cho saga orchestration thế nào?</b></summary>

Message Queue chỉ truyền tải message thuần túy, lập trình viên phải tự viết code quản lý trạng thái phức tạp của luồng. Temporal là một Workflow Engine giúp lưu trữ trạng thái bền vững (Stateful) của toàn bộ luồng nghiệp vụ tự động, hỗ trợ tự động retry, timeout và quản lý luồng chạy dài (dù server sập luồng vẫn tiếp tục chạy đúng điểm dừng).
</details>

<details>
<summary><b>Q: Trade-off giữa orchestration và choreography là gì?</b></summary>

Orchestration dễ theo dõi luồng (high visibility), dễ kiểm soát lỗi nhưng orchestrator có thể trở thành điểm nghẽn cổ chai (single point of failure) và làm tăng tính phụ thuộc lẫn nhau. Choreography giảm tính phụ thuộc (loose coupling), hiệu năng cao nhưng hệ thống rất khó debug, khó theo dõi toàn bộ luồng sự kiện.
</details>
