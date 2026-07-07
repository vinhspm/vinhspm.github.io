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
- **Q:** type=ALL trong EXPLAIN có nghĩa gì?
- **Q:** Tune HikariCP pool size thế nào?
