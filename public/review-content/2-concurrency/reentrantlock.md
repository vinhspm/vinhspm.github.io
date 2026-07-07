# ReentrantLock

**Breadcrumb:** 2. Concurrency › Synchronization

> <code>ReentrantLock</code> là lock tường minh có ngữ nghĩa giống <code>synchronized</code> nhưng thêm <code>tryLock()</code>, timeout, interruptibility và fairness.

## Các điểm chính

- ✦ <code>tryLock()</code>: lấy lock mà không block — trả về false nếu không có.
- ✦ <code>tryLock(time, unit)</code>: lấy với timeout — tránh block vô thời hạn.
- ✦ <code>lockInterruptibly()</code>: lấy nhưng phản hồi thread interruption.
- ✦ Fairness: <code>new ReentrantLock(true)</code> — thread chờ lâu nhất được lock trước (throughput thấp hơn, ngăn starvation).
- ✦ Phải giải phóng trong block <code>finally</code> — không tự giải phóng khi exception như synchronized.
- ✦ Đối tượng <code>Condition</code> (<code>lock.newCondition()</code>) thay thế wait/notify với nhiều condition mỗi lock.

*ReentrantLock: tryLock timeout, lockInterruptibly, multiple Condition queues, fair lock*
```java
import java.util.concurrent.locks.*;
import java.util.concurrent.*;
import java.util.*;

// ---- ReentrantLock vs synchronized ----
// Use ReentrantLock when you need:
//   tryLock() — acquire without blocking (avoid deadlock)
//   tryLock(timeout) — timed acquisition
//   lockInterruptibly() — respond to Thread.interrupt()
//   Multiple Condition queues per lock
//   Fairness (FIFO ordering)

public class OrderCheckoutService {

    // Two separate Condition variables on ONE lock — impossible with synchronized
    private final ReentrantLock lock     = new ReentrantLock(true); // fair=true: FIFO
    private final Condition paymentReady = lock.newCondition();
    private final Condition inventoryOk  = lock.newCondition();

    private final Queue<Order> paymentQueue   = new LinkedList<>();
    private final Queue<Order> inventoryQueue = new LinkedList<>();

    // ---- tryLock with timeout: avoid deadlock on payment gateway ----
    public PaymentResult processPayment(Order order, long timeoutMs)
            throws InterruptedException {
        // Try to acquire lock within timeout — back off instead of deadlocking
        if (!lock.tryLock(timeoutMs, TimeUnit.MILLISECONDS)) {
            return PaymentResult.timeout("Payment processing timed out");
        }
        try {
            return paymentGateway.charge(order);
        } finally {
            lock.unlock();   // MUST be in finally — otherwise lock is held forever
        }
    }

    // ---- lockInterruptibly: allow cancellation while waiting ----
    public void reserveInventory(Order order) throws InterruptedException {
        lock.lockInterruptibly();  // can be cancelled by Thread.interrupt()
        try {
            while (!inventoryService.hasStock(order)) {
                // Await on specific condition — only signal this when inventory changes
                inventoryOk.await(5, TimeUnit.SECONDS);
            }
            inventoryService.reserve(order);
            paymentReady.signal();  // notify payment thread that inventory is secured
        } finally {
            lock.unlock();
        }
    }

    public void waitForPayment(Order order) throws InterruptedException {
        lock.lock();
        try {
            while (!paymentService.isPaid(order)) {
                paymentReady.await();  // waits on paymentReady condition only
                // Other threads waiting on inventoryOk are NOT disturbed
            }
        } finally {
            lock.unlock();
        }
    }

    // ---- Fair lock for equal-priority checkout requests ----
    public int getQueueLength() {
        lock.lock();
        try {
            return lock.getQueueLength();  // ReentrantLock exposes this; synchronized does not
        } finally {
            lock.unlock();
        }
    }
}
```

### 💡 Lời khuyên thực tế

Dùng ReentrantLock khi cần: timed lock để tránh deadlock, interruptible lock wait, nhiều condition queue mỗi lock, hoặc fairness. Nếu không, `synchronized` đơn giản hơn và JVM tối ưu tốt hơn.

### ❓ Câu hỏi phỏng vấn

- **Q:** Khi nào bạn dùng ReentrantLock thay vì synchronized?
- **Q:** Condition object khác wait/notify như thế nào?
- **Q:** Điều gì xảy ra nếu bạn quên gọi unlock() trong finally block?
