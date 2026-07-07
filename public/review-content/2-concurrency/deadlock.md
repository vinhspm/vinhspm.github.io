# Deadlock

**Breadcrumb:** 2. Concurrency

> Deadlock xảy ra khi hai hoặc nhiều thread mỗi cái giữ tài nguyên mà cái kia cần và không ai có thể tiến triển — yêu cầu đồng thời cả bốn điều kiện Coffman.

## Các điểm chính

- ✦ Điều kiện Coffman: **Mutual Exclusion**, **Hold & Wait**, **No Preemption**, **Circular Wait**.
- ✦ Phòng ngừa: luôn lấy lock theo thứ tự global nhất quán trên tất cả code path.
- ✦ Phát hiện: <code>jstack &lt;pid&gt;</code> báo cáo thread deadlocked với thông tin lock.
- ✦ <code>ReentrantLock.tryLock(timeout)</code>: phá deadlock bằng cách bỏ qua nếu lock không có sẵn.
- ✦ Database deadlock: DB phát hiện và rollback một transaction; cần retry logic.

*Deadlock: account transfer scenario + 2 fixes (lock ordering, tryLock timeout) + detection*
```java
import java.util.concurrent.*;
import java.util.concurrent.locks.*;

// ---- Deadlock scenario: transferring between two Order accounts ----
// Thread 1: locks Alice's account, tries to lock Bob's
// Thread 2: locks Bob's account, tries to lock Alice's
// → circular wait → deadlock

public class DeadlockDemo {

    // BAD: lock order depends on which account is "from" and "to" → can deadlock
    public void transferBad(Account from, Account to, BigDecimal amount) {
        synchronized (from) {         // T1 locks Alice; T2 locks Bob
            pause(50);                // give other thread time to acquire its lock
            synchronized (to) {       // T1 waits for Bob (held by T2); T2 waits for Alice (held by T1)
                from.debit(amount);
                to.credit(amount);
            }
        }
    }

    // FIX 1: consistent lock ordering — always lock the lower-ID account first
    public void transferFixed(Account from, Account to, BigDecimal amount) {
        // Canonical order: lock account with smaller ID first, globally consistent
        Account first  = from.getId() < to.getId() ? from : to;
        Account second = from.getId() < to.getId() ? to   : from;

        synchronized (first) {
            synchronized (second) {
                from.debit(amount);
                to.credit(amount);
            }
        }
    }

    // FIX 2: tryLock with timeout — backs off if cannot acquire both locks
    private final ReentrantLock lockA = new ReentrantLock();
    private final ReentrantLock lockB = new ReentrantLock();

    public boolean transferWithTimeout(Account from, Account to, BigDecimal amount)
            throws InterruptedException {
        ReentrantLock fromLock = getLock(from);
        ReentrantLock toLock   = getLock(to);

        // Try to acquire both locks within 500ms — if timeout → abort, retry later
        if (fromLock.tryLock(500, TimeUnit.MILLISECONDS)) {
            try {
                if (toLock.tryLock(500, TimeUnit.MILLISECONDS)) {
                    try {
                        from.debit(amount);
                        to.credit(amount);
                        return true;          // success
                    } finally { toLock.unlock(); }
                }
            } finally { fromLock.unlock(); }
        }
        log.warn("Could not acquire locks for transfer from {} to {} — will retry", from.getId(), to.getId());
        return false;  // caller should retry with backoff
    }

    // ---- Detecting deadlock at runtime ----
    public static void detectDeadlocks() {
        ThreadMXBean bean = ManagementFactory.getThreadMXBean();
        long[] deadlockedIds = bean.findDeadlockedThreads();
        if (deadlockedIds != null) {
            ThreadInfo[] infos = bean.getThreadInfo(deadlockedIds, true, true);
            for (ThreadInfo info : infos) {
                System.err.printf("DEADLOCK: thread '%s' waiting on lock held by '%s'%n",
                    info.getThreadName(), info.getLockOwnerName());
            }
        }
    }
}
```

### 💡 Lời khuyên thực tế

Kiểm tra code cho nested synchronized block hoặc nested database row lock. Nếu phải lấy nhiều lock, định nghĩa thứ tự canonical global (ví dụ: theo object ID tăng dần). Dùng `tryLock` với timeout làm fallback trong tình huống lock phức tạp.

### ❓ Câu hỏi phỏng vấn

- **Q:** Bốn điều kiện cần thiết cho deadlock là gì?
- **Q:** Làm thế nào để phát hiện deadlock trong production?
- **Q:** Livelock là gì và khác deadlock thế nào?
