# Tuning Connection Pool cho High Concurrency

**Breadcrumb:** 7. System Design › High Concurrency

> Dưới high concurrency, kết nối DB trở thành bottleneck. Pool quá nhỏ → thread chờ (latency spike); pool quá lớn → DB quá tải (query chậm cho tất cả). Cân bằng là then chốt.

## Các điểm chính

- ✦ Mỗi thread gọi DB cần một connection — thread pool size nên ≤ connection pool size.
- ✦ Tổng connection tất cả app instance không vượt <code>max_connections</code> MySQL trừ headroom DBA.
- ✦ <code>connectionTimeout</code>: nếu pool hết, request chờ thời gian này rồi throw exception. Giữ 3s để fail fast.
- ✦ <code>maxLifetime</code>: connection phải được recycle trước khi MySQL đóng phía server (<code>wait_timeout</code>).
- ✦ **PgBouncer / ProxySQL**: connection multiplexer — nhiều app connection share ít DB connection hơn.
- ✦ Alert threshold: <code>hikaricp_connections_pending > 5</code> là dấu hiệu pool bão hòa trước khi error bắt đầu.

*Sizing pool multi-instance và monitoring*
```java
# Sizing HikariCP multi-instance
# MySQL max_connections = 500
# Headroom DBA/monitoring: 20
# App connections: 480
# App instances: 6
# Pool mỗi instance: 480 / 6 = 80

spring:
  datasource:
    hikari:
      maximum-pool-size: 80
      minimum-idle: 80          # stable pool = không resize overhead
      connection-timeout: 3000  # 3s fail-fast
      max-lifetime: 1800000     # 30 phút < MySQL wait_timeout

# MySQL: kiểm tra max_connections
SHOW VARIABLES LIKE 'max_connections';  # default 151

# Tăng MySQL max_connections
SET GLOBAL max_connections = 600;

# Prometheus query để monitor:
# Pool utilization: hikaricp_connections_active / hikaricp_connections_max
# Pending waits (alert > 0): hikaricp_connections_pending_total
```

### 💡 Lời khuyên thực tế

Pattern incident production điển hình: traffic spike → pool hết → request xếp hàng → 30s default timeout fire → HTTP 500 cascade. Phòng ngừa: 1) `connectionTimeout=3000ms` để fail fast, 2) alert trên `connections_pending`, 3) scale app instance trước khi pool bão hòa. Với concurrency rất cao, ProxySQL hoặc PgBouncer multiplex nhiều app connection thành ít DB connection hơn, giảm overhead DB.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Tính maximumPoolSize thế nào khi chạy 5 app instance?</b></summary>

Tổng số kết nối tối đa từ 5 instance không được vượt quá giới hạn chịu tải kết nối của DB Server (max_connections). Công thức: `5 * maximumPoolSize < max_connections - reserve`.
</details>

<details>
<summary><b>Q: Điều gì gây ra "Connection is not available, request timed out" trong HikariCP?</b></summary>

Do tất cả các kết nối trong pool đều đang bận xử lý câu lệnh chậm, hoặc ứng dụng bị rò rỉ kết nối (Connection Leak) lấy ra nhưng quên không đóng lại để trả về pool.
</details>

<details>
<summary><b>Q: Khi nào cần thêm ProxySQL trước MySQL?</b></summary>

Khi hệ thống có số lượng app instance quá lớn làm cạn kiệt kết nối trực tiếp đến MySQL, hoặc khi cần tự động hóa việc phân tách câu lệnh đọc/ghi (Read/Write splitting) và làm cache câu lệnh ở tầng trung gian.
</details>
