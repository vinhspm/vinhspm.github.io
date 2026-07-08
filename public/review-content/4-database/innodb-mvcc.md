# InnoDB & MVCC

**Breadcrumb:** 4. Database › MySQL Deep Dive

> InnoDB tổ chức data trong clustered index (row lưu theo thứ tự PK trên disk), dùng MVCC cho read đồng thời mà không block writer, và duy trì redo/undo log cho crash recovery và read consistency.

## Các điểm chính

- ✦ **Clustered index**: InnoDB lưu row theo B-tree sắp xếp theo primary key. Secondary index lưu giá trị PK, không phải row pointer.
- ✦ **MVCC**: mỗi row có hidden version column (transaction ID, rollback pointer). Reader thấy snapshot nhất quán mà không block writer.
- ✦ **Undo log**: lưu version cũ của row cho MVCC snapshot read và rollback. Transaction dài tạo undo log lớn.
- ✦ **Redo log** (iblogfile): Write-Ahead Log cho crash recovery. Change bền vững khi ghi vào đây, trước khi flush page.
- ✦ Row locking trong InnoDB thực ra là *index-entry locking* — query không dùng index sẽ lock cả bảng.
- ✦ **Next-key lock** (gap lock + row lock): ngăn phantom read ở REPEATABLE READ (default isolation MySQL).
- ✦ UUID làm PK là anti-pattern: insert ngẫu nhiên gây B-tree page split và I/O disk cao. Ưu tiên BIGINT AUTO_INCREMENT.

*Clustered index design và MVCC concurrency*
```java
-- Tốt: BIGINT AUTO_INCREMENT PK — insert sequential, ít page split
CREATE TABLE orders (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    total       DECIMAL(12,2),
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status_created (status, created_at)
);

-- MVCC: read và write đồng thời, không block nhau
-- Session A (đọc lâu)
START TRANSACTION;
SELECT COUNT(*) FROM orders WHERE status='PENDING'; -- snapshot lúc txn bắt đầu

-- Session B (ghi đồng thời — KHÔNG block Session A)
INSERT INTO orders(user_id, status, total) VALUES(42, 'PENDING', 99.9);
COMMIT;

-- Session A vẫn thấy count cũ (MVCC snapshot)
SELECT COUNT(*) FROM orders WHERE status='PENDING'; -- kết quả như cũ!
COMMIT;

-- Xem InnoDB status và lock info
SHOW ENGINE INNODB STATUS;
SELECT * FROM information_schema.INNODB_TRX;
SELECT * FROM performance_schema.data_locks;
```

### 💡 Lời khuyên thực tế

Lỗi phổ biến nhất InnoDB: dùng UUID (v4) làm primary key. UUID ngẫu nhiên insert khắp B-tree, gây page split và IOPS disk tăng vọt. Nếu cần ID unique toàn cầu, dùng UUIDv7 (có thứ tự) hoặc Snowflake-style BIGINT. REPEATABLE READ của InnoDB dùng MVCC cho SELECT nhưng dùng next-key lock cho UPDATE/DELETE — cân nhắc khi thiết kế transaction.

### ❓ Câu hỏi phỏng vấn

- **Q:** Tại sao UUID ngẫu nhiên là lựa chọn tồi cho InnoDB primary key?
  <details>
  <summary><b>Trả lời:</b></summary>

  InnoDB sắp xếp Clustered Index vật lý theo khóa chính. UUID ngẫu nhiên khiến dữ liệu chèn mới bị phân tán lung tung thay vì ghi tuần tự ở cuối trang, gây ra hiện tượng **phân mảnh trang (page split)**, làm chậm nghiêm trọng hiệu năng ghi (write IO) và tốn không gian lưu trữ index.
  </details>
- **Q:** MVCC cho phép reader và writer chạy đồng thời không block nhau thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  MVCC sử dụng cơ chế ghi nhận phiên bản lịch sử của dữ liệu (Undo Log). Khi một transaction thay đổi dòng dữ liệu (Write), nó tạo ra phiên bản mới. Các transaction khác đọc dữ liệu (Read) tại thời điểm đó sẽ được hướng dẫn đọc phiên bản cũ trong Undo Log phù hợp với snapshot của họ, tránh việc phải đợi khóa ghi kết thúc.
  </details>
- **Q:** Next-key lock là gì và InnoDB dùng nó để làm gì?
  <details>
  <summary><b>Trả lời:</b></summary>

  Next-key lock là sự kết hợp giữa Record Lock (khóa trên dòng cụ thể) và Gap Lock (khóa khoảng trống giữa các index record). InnoDB dùng nó ở mức isolation level `REPEATABLE READ` để ngăn chặn hiện tượng **Phantom Read** (dòng ma xuất hiện khi đọc lại).
  </details>
