# Pattern High Concurrency trong Java

**Breadcrumb:** 7. System Design

> Kỹ thuật High Concurrency (HC) đảm bảo ứng dụng Java xử lý hàng nghìn request đồng thời. Đòn bẩy chính: sizing thread pool đúng, tuning connection pool DB, service stateless, cache hot data, và async processing cho công việc không quan trọng.

## Các điểm chính

- ✦ **Stateless service**: không có session state trên server — cho phép scale ngang mà không cần sticky session.
- ✦ **Sizing thread pool**: I/O-bound = <code>CPU × (1 + wait/compute)</code>; CPU-bound = <code>CPU + 1</code>.
- ✦ **Connection pool**: quá nhỏ = bottleneck; quá lớn = DB quá tải. Cân bằng là chìa khóa.
- ✦ **Async offloading**: <code>@Async</code> + message queue cho công việc không quan trọng (email, notification).
- ✦ **Caching**: Redis cho hot data distributed; Caffeine cho ultra-hot data trong process (dưới microsecond).
- ✦ **Circuit breaker**: fail fast khi downstream chậm — ngăn thread pool exhaustion cascade.
- ✦ **Little's Law**: <code>N = λ × W</code> — concurrency = arrival_rate × avg_response_time.

### 💡 Lời khuyên thực tế

HC là concern xuyên suốt. Trong phỏng vấn: đừng chỉ nói "thêm server". Mô tả full stack: load balancer → stateless app server → connection pool → cache → DB với read replica. Xác định bottleneck thực trước (thường là DB, không phải app). Biết Little's Law để justify sizing bằng con số cụ thể.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Phát biểu Little's Law và dùng để size thread pool.</b></summary>

Công thức: `L = λ * W` (Số lượng request đồng thời trong hệ thống = Tốc độ request đầu vào * Thời gian xử lý trung bình). Dùng để tính toán số lượng thread tối đa cần thiết để tránh nghẽn hàng đợi.
</details>

<details>
<summary><b>Q: Walk me through thiết kế system xử lý 50K request/giây.</b></summary>

Dùng CDN cho static files -> API Gateway (Rate limit, Auth) -> DNS Round Robin / Load Balancer (L4/L7) -> Cụm Stateless Web App (Auto Scale) -> Cache tầng (Redis) giảm tải cho DB -> Hàng đợi bất đồng bộ (Kafka/RabbitMQ) cho luồng ghi phức tạp -> Database Sharding / NoSQL.
</details>

<details>
<summary><b>Q: Khi latency spike dưới high load, điều đầu tiên bạn kiểm tra là gì?</b></summary>

Kiểm tra tỷ lệ sử dụng CPU/Memory của Database Server, số lượng kết nối Connection Pool của ứng dụng có bị cạn kiệt không, hoặc thời gian chạy Garbage Collection (GC Pause) của ứng dụng.
</details>
