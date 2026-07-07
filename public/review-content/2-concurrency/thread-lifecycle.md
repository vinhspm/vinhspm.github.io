# Vòng Đời Thread

**Breadcrumb:** 2. Concurrency

> Một Java thread chuyển qua các trạng thái NEW → RUNNABLE → BLOCKED/WAITING/TIMED_WAITING → TERMINATED, được quản lý bởi JVM và OS scheduler.

## Các điểm chính

- ✦ **NEW**: đã tạo nhưng chưa start.
- ✦ **RUNNABLE**: đang chạy hoặc sẵn sàng chạy (OS quyết định CPU nào xử lý).
- ✦ **BLOCKED**: chờ lấy monitor lock (<code>synchronized</code>).
- ✦ **WAITING**: chờ vô thời hạn — <code>Object.wait()</code>, <code>Thread.join()</code>.
- ✦ **TIMED_WAITING**: chờ có timeout — <code>Thread.sleep()</code>, <code>wait(timeout)</code>.
- ✦ **TERMINATED**: run() hoàn thành hoặc ném exception.
- ✦ Dùng <code>jstack &lt;pid&gt;</code> hoặc thread dump để kiểm tra trạng thái thread đang chạy.

*Thread states: NEW→RUNNABLE→BLOCKED→WAITING→TIMED_WAITING→TERMINATED + JMX monitoring*
```java
import java.util.concurrent.*;
import java.util.concurrent.locks.*;

// ---- Observing all 6 thread states in Order processing context ----
public class ThreadLifecycleDemo {

    private final Object orderLock = new Object();

    public void demonstrateStates() throws InterruptedException {

        // ---- State 1: NEW ----
        Thread orderProcessor = new Thread(() -> {
            System.out.println("[1] RUNNABLE: processing order...");

            // ---- State 4: TIMED_WAITING (Thread.sleep) ----
            try {
                Thread.sleep(2000);   // simulate I/O wait
            } catch (InterruptedException e) {
                // CORRECT interrupt handling: restore flag so callers can check it
                Thread.currentThread().interrupt();
                System.out.println("Thread interrupted — stopping gracefully");
                return;
            }
            System.out.println("[2] RUNNABLE: order processed");
        }, "order-processor-1");

        System.out.println("State after new:  " + orderProcessor.getState()); // NEW

        // ---- State 2: RUNNABLE ----
        orderProcessor.start();
        Thread.sleep(50);  // let it start
        System.out.println("State after start: " + orderProcessor.getState()); // RUNNABLE

        // Give it a moment to reach sleep()
        Thread.sleep(100);
        System.out.println("State while sleeping: " + orderProcessor.getState()); // TIMED_WAITING

        // ---- State 3: BLOCKED (waiting for monitor lock) ----
        synchronized (orderLock) {
            Thread blocker = new Thread(() -> {
                synchronized (orderLock) {  // tries to acquire lock held by main thread
                    System.out.println("Got lock");
                }
            }, "order-blocker");

            blocker.start();
            Thread.sleep(50);
            System.out.println("Blocker state:  " + blocker.getState()); // BLOCKED
        } // main releases lock → blocker transitions BLOCKED → RUNNABLE

        // ---- State 5: WAITING (join) ----
        Thread waiter = new Thread(() -> {
            try {
                orderProcessor.join();  // WAITING indefinitely until orderProcessor dies
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "order-waiter");
        waiter.start();
        Thread.sleep(50);
        System.out.println("Waiter state:   " + waiter.getState()); // WAITING

        // ---- State 6: TERMINATED ----
        orderProcessor.join();
        System.out.println("Final state:    " + orderProcessor.getState()); // TERMINATED
    }
}

// ---- Production: monitor thread states via JMX ----
public static void printThreadStats() {
    ThreadMXBean bean = ManagementFactory.getThreadMXBean();
    System.out.printf("Threads — total: %d  peak: %d  daemon: %d%n",
        bean.getThreadCount(), bean.getPeakThreadCount(), bean.getDaemonThreadCount());

    // Find blocked/waiting threads (potential deadlock or starvation)
    for (ThreadInfo info : bean.getThreadInfo(bean.getAllThreadIds())) {
        if (info.getThreadState() == Thread.State.BLOCKED ||
            info.getThreadState() == Thread.State.WAITING) {
            System.out.printf("  [%s] %s → waiting on: %s%n",
                info.getThreadState(), info.getThreadName(), info.getLockName());
        }
    }
}
```

### 💡 Lời khuyên thực tế

Trong thread dump, thread BLOCKED chỉ ra lock contention. Thread WAITING chỉ ra deadlock tiềm năng. Dùng Prometheus + micrometer để theo dõi số thread đang hoạt động và độ sâu queue của executor trong production.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa trạng thái BLOCKED và WAITING là gì?
- **Q:** Làm thế nào để lấy thread dump trong production?
- **Q:** Điều gì xảy ra với một thread khi nó gọi Thread.sleep()?
