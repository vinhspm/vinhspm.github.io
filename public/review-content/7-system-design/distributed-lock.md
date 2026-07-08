# Distributed Lock

**Breadcrumb:** 7. System Design

> Distributed lock đảm bảo chỉ một instance trong cluster thực thi critical section tại một thời điểm — ngăn race condition trong service được scale horizontally.

## Các điểm chính

- ✦ Use case: scheduled job chạy trên nhiều instance, giảm tồn kho, đặt chỗ.
- ✦ Redis <code>SETNX</code>: "SET if Not eXists" — atomic. Thêm TTL để ngăn deadlock nếu holder chết.
- ✦ **Redlock**: lock dựa trên quorum qua N Redis node cho fault tolerance cao hơn.
- ✦ Lease renewal: nếu critical section mất lâu hơn TTL, background thread phải renew.
- ✦ Thay thế: DB advisory lock (<code>pg_advisory_lock</code>), ZooKeeper, etcd.

*Redisson RLock: inventory reservation với tryLock + watchdog; scheduled job dedup; Spring Integration alternative*
```java
// Distributed Lock: prevent race conditions when multiple instances run concurrently
// Use case: inventory decrement, scheduled job dedup, double-booking prevention

// Redisson RLock: implements Redlock algorithm with lease renewal (watchdog)
@Service @RequiredArgsConstructor
public class InventoryService {
    private final RedissonClient redisson;
    private final InventoryRepository inventoryRepo;

    public boolean reserveStock(String productId, int qty) {
        // Lock key scoped to product — allows concurrent locks on DIFFERENT products
        RLock lock = redisson.getLock("lock:inventory:" + productId);

        // tryLock(waitTime=5s, leaseTime=10s)
        // waitTime: how long to wait if lock is held by another instance
        // leaseTime: auto-release after 10s (prevents deadlock if holder crashes)
        // Redisson watchdog: auto-renews lease every 10s/3 while lock is held
        try {
            if (!lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                log.warn("Could not acquire inventory lock: productId={}", productId);
                return false; // caller can retry
            }
            try {
                int available = inventoryRepo.getAvailableQty(productId);
                if (available < qty) {
                    throw new InsufficientStockException(productId, qty, available);
                }
                inventoryRepo.decrement(productId, qty);
                log.info("Reserved {} units of {}", qty, productId);
                return true;
            } finally {
                if (lock.isHeldByCurrentThread()) {
                    lock.unlock(); // always release in inner finally
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}

// Scheduled job deduplication: only one instance runs the job
@Scheduled(fixedDelay = 60_000)
public void processExpiredOrders() {
    RLock lock = redisson.getLock("lock:job:process-expired-orders");
    if (!lock.tryLock()) return; // another instance is running this job
    try {
        orderService.cancelExpiredOrders();
    } finally {
        if (lock.isHeldByCurrentThread()) lock.unlock();
    }
}

// Alternative: Spring Integration distributed lock with Redis
// @Bean LockRegistry lockRegistry(RedisConnectionFactory factory) {
//     return new RedisLockRegistry(factory, "spring-lock", 10_000L);
// }
```

### 💡 Lời khuyên thực tế

Dùng Redisson cho distributed lock trong Spring Boot — nó implement Redlock đúng cách bao gồm lease renewal. Đừng bao giờ dùng `SETNX` thô từ code app — bạn sẽ làm sai TTL và renewal logic. Luôn unlock trong `finally`.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Vấn đề với dùng Redis SETNX đơn giản cho distributed lock là gì?</b></summary>

Nguy cơ mất lock nếu node Redis master chứa lock bị sập trước khi đồng bộ sang replica, hoặc tiến trình bị tạm dừng (GC pause) quá lâu vượt quá thời gian hết hạn TTL của lock, dẫn đến việc tiến trình khác tưởng lock đã trống và nhảy vào chiếm đoạt.
</details>

<details>
<summary><b>Q: Thuật toán Redlock là gì?</b></summary>

Là thuật toán khóa phân tán chạy trên nhiều node Redis độc lập (không master-slave). Client phải chiếm quyền khóa thành công trên đa số node (quorum) trong khoảng thời gian ngắn thì mới coi là lấy lock thành công.
</details>

<details>
<summary><b>Q: Làm thế nào để ngăn deadlock với distributed lock nếu lock holder crash?</b></summary>

Luôn luôn cấu hình thời gian tự động hết hạn (Lease Time/TTL) cho lock để giải phóng tài nguyên tự động nếu tiến trình sở hữu lock bị chết đột ngột.
</details>
