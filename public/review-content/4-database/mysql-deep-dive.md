# MySQL — Kiến Thức Chuyên Sâu

**Breadcrumb:** 4. Database

> Kiến thức MySQL chuyên sâu: InnoDB engine internals, đọc EXPLAIN plan, phân tích slow query, và cấu hình connection pool — tất cả đều quan trọng cho Java backend engineer làm việc với MySQL production.

## Các điểm chính

- ✦ InnoDB: storage engine mặc định. Row-level locking, ACID transaction, clustered index, MVCC.
- ✦ EXPLAIN: phân tích execution plan để phát hiện full table scan và index bị thiếu.
- ✦ Slow Query Log: tìm ra bottleneck hiệu năng thực từ traffic production.
- ✦ HikariCP: connection pool mặc định của Spring Boot — tune <code>maximumPoolSize</code> và timeout.

### 💡 Lời khuyên thực tế

Kiến thức MySQL được expect nếu JD nhắc đến MySQL. Biết InnoDB internals (clustered index, MVCC) để giải thích locking behavior. Đọc được EXPLAIN plan là kỹ năng thực tế nhất để fix slow query.

### ❓ Câu hỏi phỏng vấn

- **Q:** Clustered index là gì và InnoDB implement thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Clustered index sắp xếp thứ tự lưu trữ vật lý của các dòng dữ liệu trên đĩa. Trong InnoDB, clustered index bắt buộc được gán cho Primary Key (hoặc Unique Index không null đầu tiên nếu không có PK, hoặc một cột ẩn tự tăng do InnoDB tự sinh).
  </details>
- **Q:** type=ALL trong EXPLAIN có nghĩa gì?
  <details>
  <summary><b>Trả lời:</b></summary>

  Là Full Table Scan. Đây là tín hiệu xấu chứng tỏ query không sử dụng được index nào để lọc dữ liệu và buộc phải quét qua toàn bộ bảng.
  </details>
- **Q:** Tune HikariCP pool size thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Dựa trên số lượng core CPU của database, cấu hình đĩa cứng và số lượng kết nối mạng song song. Quy tắc ngón tay cái nổi tiếng của PostgreSQL/HikariCP là: `connections = ((physical_cores * 2) + effective_spindle_count)`. Sau đó cần đo đạc thực tế để tinh chỉnh.
  </details>
