# Database Locking

**Breadcrumb:** 4. Database › Transactions

> Lock ngăn transaction đồng thời làm hỏng dữ liệu chia sẻ — từ table-level đến row-level, với loại lock shared (đọc) và exclusive (ghi).

## Các điểm chính

- ✦ **Shared lock (S)**: nhiều reader được phép đồng thời. <code>SELECT FOR SHARE</code>.
- ✦ **Exclusive lock (X)**: một writer duy nhất; block tất cả reader/writer khác. <code>SELECT FOR UPDATE</code>.
- ✦ **Row-level locking**: chi tiết nhất; concurrency cao. Table-level: thô hơn, overhead thấp hơn.
- ✦ **Optimistic locking**: không lock khi đọc; kiểm tra version lúc ghi (thất bại nếu thay đổi).
- ✦ **Pessimistic locking**: lock khi đọc (<code>SELECT FOR UPDATE</code>); giữ đến khi commit.
- ✦ Deadlock: hai transaction giữ lock mà cái kia cần. DB phát hiện và rollback một.

*Pessimistic (SELECT FOR UPDATE, FOR SHARE, deadlock) + Optimistic (@Version, @Retryable)*
```java
-- ✅ Pessimistic locking: SELECT FOR UPDATE — lock the row before reading
-- Use when: high-contention (flash sale, ticket booking) and retry is too expensive
BEGIN;
-- Locks the product row immediately; other transactions block on this line until we COMMIT
SELECT id, stock FROM products WHERE id = 99 FOR UPDATE;
-- Now safe: no other transaction can modify stock until we release the lock
UPDATE products SET stock = stock - 2 WHERE id = 99;
INSERT INTO order_items(order_id, product_id, quantity) VALUES (5001, 99, 2);
COMMIT;  -- lock released here

-- SELECT FOR SHARE: allows other readers but blocks writers
BEGIN;
SELECT * FROM orders WHERE id = 5001 FOR SHARE;  -- other readers OK; writers wait
-- Use when: you read data that must stay stable but don't need to write it
COMMIT;

-- ✅ Deadlock scenario (and how DB detects it):
-- T1: LOCK product 99 → then tries to lock product 100
-- T2: LOCK product 100 → then tries to lock product 99
-- DB detects cycle → rolls back one transaction with "deadlock detected" error
-- Prevention: always acquire locks in the same order (e.g., by ascending product ID)

-- ✅ Optimistic locking (JPA @Version): version field checked on every UPDATE
-- Use when: low-contention (user profile updates) and retry is cheap
@Entity
@Table(name = "products")
public class Product {
    @Id
    private Long id;
    private String name;
    private int stock;

    @Version
    private Long version;  // incremented automatically by Hibernate on each flush
}

@Transactional
@Retryable(value = OptimisticLockException.class, maxAttempts = 3, backoff = @Backoff(delay = 100))
public void decrementStock(Long productId, int qty) {
    Product p = productRepository.findById(productId).orElseThrow();
    if (p.getStock() < qty) throw new OutOfStockException();
    p.setStock(p.getStock() - qty);
    // Hibernate issues: UPDATE products SET stock=?, version=? WHERE id=? AND version=?
    //                                                               ^^^^^^^^^^^^^^^^^^^^^^^^
    //                                                               If version changed → 0 rows → OptimisticLockException
}  // @Retryable retries up to 3 times with 100ms delay
```

### 💡 Lời khuyên thực tế

Dùng optimistic locking (`@Version`) cho tình huống low-contention — tránh lock overhead và scale tốt hơn. Dùng pessimistic locking cho tài nguyên contention cao (ví dụ: đặt chỗ) nơi xung đột thường xuyên và retry tốn kém.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa optimistic và pessimistic locking là gì?</b></summary>

Optimistic locking không khóa dữ liệu ở tầng DB, nó kiểm tra phiên bản dữ liệu (`@Version`) lúc ghi đè; nếu có xung đột phiên bản thì ném lỗi để ứng dụng xử lý (phù hợp hệ thống ít xung đột ghi). Pessimistic locking chủ động khóa trực tiếp các hàng dữ liệu ở tầng DB (`SELECT ... FOR UPDATE`), ngăn chặn các transaction khác đọc/ghi dòng đó cho tới khi transaction hiện tại kết thúc (phù hợp hệ thống xung đột ghi cao).
</details>

<details>
<summary><b>Q: Deadlock trong DB có thể xảy ra khi nào và DB giải quyết thế nào?</b></summary>

Deadlock xảy ra khi hai hay nhiều transaction chờ đợi nhau giải phóng các khóa mà đối phương đang nắm giữ (A chờ B giải phóng khóa dòng 2, B chờ A giải phóng khóa dòng 1). DB giải quyết bằng cách chạy thuật toán phát hiện chu kỳ khóa (deadlock detection), tự động hủy (abort/rollback) một transaction để giải phóng tài nguyên cho các transaction còn lại chạy tiếp.
</details>

<details>
<summary><b>Q: @Version implement optimistic locking trong JPA thế nào?</b></summary>

JPA thêm một cột phiên bản (thường là số nguyên) vào bảng. Mỗi khi cập nhật dữ liệu, JPA thực hiện câu lệnh: `UPDATE table SET ..., version = version + 1 WHERE id = ? AND version = current_version`. Nếu số hàng cập nhật trả về bằng 0, nghĩa là đã có transaction khác sửa trước đó, JPA sẽ ném ra `OptimisticLockException`.
</details>
