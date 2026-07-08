# Strong Consistency

**Breadcrumb:** 7. System Design › Consistency Patterns

> Strong consistency (linearizability) đảm bảo mọi read thấy write gần nhất — như thể thao tác thực thi tuần tự trên một node, với chi phí latency cao hơn và availability thấp hơn.

## Các điểm chính

- ✦ Linearizability: thao tác xuất hiện tức thời; lịch sử nhất quán với model single-node.
- ✦ Cần: synchronous replication đến quorum trước khi acknowledge write, hoặc single-leader serialization.
- ✦ Hệ thống: PostgreSQL (trong single node), Google Spanner (globally consistent qua TrueTime), CockroachDB.
- ✦ Trade-off: write latency cao hơn (phải chờ quorum), availability giảm khi partition (CP).
- ✦ Use case: số dư tài chính, số lượng tồn kho, distributed lock, leader election.

*Strong consistency: SERIALIZABLE isolation; PostgreSQL sync replication; Spanner TrueTime; distributed lock pattern*
```java
// Strong Consistency: every read returns the most recent committed write
// Required for: payment processing, inventory decrement, distributed locking

// 1. PostgreSQL: strong consistency by default (single-node ACID)
@Service @RequiredArgsConstructor
public class PaymentService {

    // SERIALIZABLE: strongest isolation — no phantom reads, no concurrent anomalies
    // Use for: financial transfer, inventory update
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PaymentResult processPayment(String orderId, BigDecimal amount) {
        // Reads within this tx always see the latest committed data
        Account account = accountRepo.findByOrderId(orderId);
        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(orderId, amount, account.getBalance());
        }
        account.debit(amount);
        accountRepo.save(account);
        return PaymentResult.success(orderId, amount);
    }

    // READ_COMMITTED (default): balance may update between reads within same tx
    // REPEATABLE_READ: same row returns same value within tx
    // SERIALIZABLE: no concurrent anomalies — behaves like sequential execution
}

// 2. Distributed strong consistency: PostgreSQL synchronous replication
// postgresql.conf: synchronous_commit = on  (default)
// → Primary waits for at least one replica WAL write before acknowledging commit
// synchronous_standby_names = 'replica-1'  → named standby must confirm
// Cost: write latency += replication round-trip (~1-5ms same datacenter)

// 3. Global strong consistency: Google Spanner / CockroachDB
// Uses TrueTime API (Spanner) or Hybrid Logical Clocks (CockroachDB)
// to assign globally monotonic timestamps across datacenters
// Reads at timestamp T guaranteed to see all commits before T globally

// 4. Application-level strong consistency with Redis distributed lock
@Transactional
public boolean reserveInventory(String productId, int qty) {
    RLock lock = redisson.getLock("lock:inventory:" + productId);
    lock.lock(10, TimeUnit.SECONDS); // exclusive lock → no concurrent decrement
    try {
        int available = inventoryRepo.getAvailableQty(productId);  // fresh read under lock
        if (available < qty) return false;
        inventoryRepo.decrement(productId, qty);
        return true;
    } finally {
        lock.unlock();
    }
}
// Strong: lock ensures only one thread decrements at a time → no oversell
// Cost: serialized writes (throughput limited by lock contention)
```

### 💡 Lời khuyên thực tế

Dùng strong consistency cho thao tác nơi tính đúng đắn là tối quan trọng (tài chính, tồn kho). Chấp nhận chi phí latency. Thiết kế hệ thống cần strong consistency ở ít nơi hơn bằng cách đẩy state vào append-only event log và dùng eventual consistency cho derived view.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Linearizability là gì?</b></summary>

Là mức độ nhất quán mạnh mẽ nhất cho các hoạt động đơn lẻ trên một đối tượng: đảm bảo mọi hoạt động đọc đều trả về giá trị mới nhất của lệnh ghi thành công gần nhất theo đúng dòng thời gian thực tế toàn cầu.
</details>

<details>
<summary><b>Q: Google Spanner đạt global strong consistency thế nào?</b></summary>

Sử dụng công nghệ **TrueTime API** kết hợp đồng bộ hóa đồng hồ phần cứng có độ chính xác cao bằng định vị GPS và đồng hồ nguyên tử (Atomic Clocks) để gán timestamp chính xác tuyệt đối cho các transaction trên toàn cầu.
</details>

<details>
<summary><b>Q: Chi phí của strong consistency trong distributed system là gì?</b></summary>

Đánh đổi bằng hiệu năng (tăng độ trễ do phải chờ đồng thuận giữa các node qua 2-phase commit/Paxos) và giảm tính khả dụng (hệ thống có thể từ chối phục vụ nếu không đủ số node phản hồi).
</details>
