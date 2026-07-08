# Command Pattern

**Breadcrumb:** 10. Design Patterns › Behavioral

> Command encapsulate request như object với method execute() — cho phép parameterization, queuing, logging và undo/redo của operation.

## Các điểm chính

- ✦ **Command**: interface với <code>execute()</code> và tùy chọn <code>undo()</code>.
- ✦ **Invoker**: giữ lịch sử command, gọi execute/undo.
- ✦ **Receiver**: object thực sự thực hiện hành động.
- ✦ Use case: undo/redo, macro recording, job queue, audit log, transactional script.

*PlaceOrderCommand + CancelOrderCommand + CommandHistory (undo/redo) + audit trail*
```java
// ── Command interface ─────────────────────────────────────────────────────────
public interface OrderCommand {
    void execute();   // perform the operation
    void undo();      // reverse the operation
    String describe(); // human-readable description for audit log
}

// ── PlaceOrderCommand — receiver: OrderService ────────────────────────────────
public class PlaceOrderCommand implements OrderCommand {
    private final OrderService  orderService;
    private final OrderRequest  request;
    private       Order         placedOrder;  // stored for undo

    public PlaceOrderCommand(OrderService service, OrderRequest request) {
        this.orderService = service;
        this.request      = request;
    }

    @Override
    public void execute() {
        placedOrder = orderService.placeOrder(request);
        log.info("PlaceOrderCommand.execute() orderId={}", placedOrder.getId());
    }

    @Override
    public void undo() {
        if (placedOrder == null) throw new IllegalStateException("Cannot undo: not yet executed");
        orderService.cancelOrder(placedOrder.getId());
        log.info("PlaceOrderCommand.undo() cancelled orderId={}", placedOrder.getId());
    }

    @Override public String describe() {
        return "Place order for user=" + request.getUserId() + " items=" + request.getItemCount();
    }
}

// ── CancelOrderCommand — receiver: OrderService ───────────────────────────────
public class CancelOrderCommand implements OrderCommand {
    private final OrderService orderService;
    private final Long         orderId;
    private       Order        cancelledOrder;  // snapshot before cancel, for undo

    @Override
    public void execute() {
        cancelledOrder = orderService.findById(orderId);   // snapshot current state
        orderService.cancelOrder(orderId);
        log.info("CancelOrderCommand.execute() orderId={}", orderId);
    }

    @Override
    public void undo() {
        // Restore order to its previous state (only if business rules allow)
        orderService.restoreOrder(cancelledOrder);
        log.info("CancelOrderCommand.undo() restored orderId={}", orderId);
    }

    @Override public String describe() { return "Cancel order orderId=" + orderId; }
}

// ── CommandHistory (Invoker) — executes, tracks, and undoes commands ──────────
@Service
public class OrderCommandHistory {
    private final Deque<OrderCommand> history = new ArrayDeque<>();
    private final AuditLogRepository  auditLog;

    public void execute(OrderCommand command) {
        command.execute();
        history.push(command);
        auditLog.record(command.describe(), "EXECUTED");  // audit trail
    }

    public void undo() {
        if (history.isEmpty()) throw new IllegalStateException("Nothing to undo");
        OrderCommand last = history.pop();
        last.undo();
        auditLog.record(last.describe(), "UNDONE");
    }

    public List<String> getHistory() {
        return history.stream().map(OrderCommand::describe).toList();
    }
}

// ── Usage: checkout flow with undo capability ─────────────────────────────────
@Service @RequiredArgsConstructor
public class CheckoutCommandService {
    private final OrderCommandHistory commandHistory;
    private final OrderService        orderService;

    public Order checkout(OrderRequest request) {
        PlaceOrderCommand cmd = new PlaceOrderCommand(orderService, request);
        commandHistory.execute(cmd);  // → place order + record in history
        return cmd.getPlacedOrder();
    }

    public void undoLastAction() {
        commandHistory.undo();        // → cancel most recent order
    }
}
```

### 💡 Lời khuyên thực tế

Dùng Command cho bất kỳ UI action cần undo, bất kỳ operation nên được queue và thực thi sau, hoặc bất kỳ tập hợp operation cần transactional rollback semantics. Spring Batch Step là một Command.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Command cho phép undo/redo thế nào?</b></summary>

Bằng cách định nghĩa thêm phương thức `undo()` (và `execute()`) bên trong interface Command, đồng thời sử dụng một History Stack để lưu trữ danh sách các đối tượng Command đã được chạy; khi cần undo/redo chỉ cần pop lệnh ra và gọi hàm tương ứng.
</details>

<details>
<summary><b>Q: Vai trò của Invoker trong Command pattern?</b></summary>

Là đối tượng kích hoạt việc thực thi Command (ví dụ nút bấm trên UI). Invoker nhận đối tượng Command và gọi phương thức thực thi của nó mà không hề biết chi tiết lệnh đó sẽ làm gì và thao tác trên Receiver nào.
</details>

<details>
<summary><b>Q: Làm thế nào để implement job queue với Command?</b></summary>

Biến các công việc cần chạy thành các class Command, đẩy chúng vào một Queue (như BlockingQueue). Các luồng Worker sẽ liên tục lấy Command từ Queue ra và gọi phương thức `execute()` để xử lý tuần tự hoặc song song.
</details>
