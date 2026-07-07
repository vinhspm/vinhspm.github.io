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

- **Q:** Phát biểu Little's Law và dùng để size thread pool.
- **Q:** Walk me through thiết kế system xử lý 50K request/giây.
- **Q:** Khi latency spike dưới high load, điều đầu tiên bạn kiểm tra là gì?
