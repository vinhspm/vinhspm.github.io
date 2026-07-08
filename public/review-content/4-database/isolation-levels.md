# Isolation Level

**Breadcrumb:** 4. Database › Transactions

> Isolation level đánh đổi consistency lấy concurrency — isolation cao hơn ngăn nhiều anomaly hơn nhưng giảm throughput qua locking tăng hoặc MVCC overhead.

## Các điểm chính

- ✦ **READ UNCOMMITTED**: cho phép dirty read (thấy thay đổi chưa commit của transaction khác). Hiếm dùng.
- ✦ **READ COMMITTED** (mặc định PostgreSQL): không dirty read; non-repeatable read có thể xảy ra.
- ✦ **REPEATABLE READ**: cùng hàng trả về cùng giá trị trong transaction; phantom read có thể (MySQL) hoặc không (PostgreSQL với MVCC).
- ✦ **SERIALIZABLE**: transaction xuất hiện như thực thi tuần tự; ngăn tất cả anomaly. Chi phí cao nhất.
- ✦ Anomaly: *Dirty read* (đọc uncommitted), *Non-repeatable read* (hàng thay đổi giữa hai lần đọc), *Phantom read* (hàng mới xuất hiện).

*Tất cả 4 isolation levels: anomaly matrix + SQL examples + Spring @Transactional*
```java
-- ✅ Anomaly reference: what each isolation level prevents
-- Level              | Dirty Read | Non-Repeatable Read | Phantom Read
-- READ UNCOMMITTED   |     ❌     |         ❌          |      ❌
-- READ COMMITTED     |     ✅     |         ❌          |      ❌   ← PostgreSQL default
-- REPEATABLE READ    |     ✅     |         ✅          |  ✅ (PG MVCC) / ❌ (MySQL)
-- SERIALIZABLE       |     ✅     |         ✅          |      ✅   ← strictest

-- ✅ READ COMMITTED (default): each statement sees freshly committed data
-- Suitable for: most CRUD operations, order placement
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
  SELECT stock FROM products WHERE id = 99;  -- reads committed value at this moment
  -- Another transaction commits a stock change here
  SELECT stock FROM products WHERE id = 99;  -- may return DIFFERENT value (non-repeatable read)
COMMIT;

-- ✅ REPEATABLE READ: snapshot taken at transaction start — reads are stable
-- Suitable for: checkout flow that reads then updates based on the same data
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
  SELECT stock FROM products WHERE id = 99;  -- snapshot: 10
  -- Another transaction commits stock = 8 here
  SELECT stock FROM products WHERE id = 99;  -- still 10 (PostgreSQL MVCC snapshot)
  UPDATE products SET stock = stock - 2 WHERE id = 99 AND stock >= 2;
COMMIT;

-- ✅ SERIALIZABLE: strictest — transactions appear to run one-at-a-time
-- Suitable for: financial aggregates, balance sheets, concurrent booking
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  SELECT SUM(total) FROM orders WHERE customer_id = 42;   -- consistent aggregate
  -- No phantom rows can appear mid-transaction
  INSERT INTO order_summary(customer_id, lifetime_value) VALUES (42, (SELECT SUM(total)...));
COMMIT;  -- if conflict detected → ERROR: could not serialize access → retry

-- ✅ Spring: per-method isolation
@Transactional(isolation = Isolation.REPEATABLE_READ)
public CheckoutResult checkout(Long orderId) { /* reads + updates in one snapshot */ }

@Transactional(isolation = Isolation.SERIALIZABLE)
public FinancialReport generateReport(Long customerId) { /* consistent across all reads */ }
```

### 💡 Lời khuyên thực tế

Dùng READ COMMITTED (mặc định) cho hầu hết thao tác. Dùng REPEATABLE READ cho báo cáo đọc cùng dữ liệu nhiều lần. Dùng SERIALIZABLE cho thao tác tài chính quan trọng nơi phantom read gây không nhất quán. Monitor lỗi serialization và implement retry logic.

### ❓ Câu hỏi phỏng vấn

- **Q:** Dirty read là gì và isolation level nào ngăn nó?
  <details>
  <summary><b>Trả lời:</b></summary>

  Dirty read xảy ra khi Transaction A đọc được dữ liệu đã bị sửa đổi bởi Transaction B nhưng Transaction B vẫn chưa commit. Nếu B rollback, dữ liệu A đã đọc trở thành vô nghĩa. Các mức isolation từ **READ COMMITTED** trở lên sẽ ngăn chặn được hiện tượng này.
  </details>
- **Q:** Sự khác biệt giữa non-repeatable read và phantom read là gì?
  <details>
  <summary><b>Trả lời:</b></summary>

  Non-repeatable read xảy ra khi đọc lại một dòng dữ liệu hiện tại thấy giá trị của nó **bị thay đổi** (do transaction khác UPDATE/DELETE và commit). Phantom read xảy ra khi chạy lại cùng một query tìm kiếm và thấy **thêm các dòng mới** xuất hiện (do transaction khác INSERT và commit).
  </details>
- **Q:** PostgreSQL implement REPEATABLE READ khác MySQL thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Trong PostgreSQL, REPEATABLE READ ngăn chặn hoàn toàn cả Phantom Read (không cho phép chèn dòng ma). Trong MySQL (InnoDB), REPEATABLE READ mặc định sử dụng Next-key lock để ngăn phantom read, nhưng có trường hợp đặc biệt vẫn có thể gặp nếu chèn ép khóa thủ công; đồng thời PostgreSQL sẽ ném lỗi Serialization Error nếu phát hiện xung đột ghi song song, yêu cầu ứng dụng phải retry.
  </details>
