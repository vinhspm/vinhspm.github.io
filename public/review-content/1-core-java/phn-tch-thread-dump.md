# Phân Tích Thread Dump

**Breadcrumb:** 1. Core Java › Performance Tuning

> Thread dump hiển thị tất cả thread trong JVM với trạng thái hiện tại và stack trace. Công cụ chính để chẩn đoán CPU spike, deadlock, và latency chậm do lock contention.

## Các điểm chính

- ✦ **RUNNABLE**: thread đang chạy Java code hoặc chờ OS (có thể đang I/O hoặc bị OS scheduling).
- ✦ **BLOCKED**: đang chờ acquire Java monitor lock đang bị thread khác giữ — lock contention.
- ✦ **WAITING**: chờ vô thời hạn trên <code>Object.wait()</code>, <code>LockSupport.park()</code>, <code>Thread.join()</code>.
- ✦ **TIMED_WAITING**: tương tự nhưng có timeout — <code>Thread.sleep()</code>, <code>wait(timeout)</code>.
- ✦ Chẩn đoán CPU cao: tương quan thread ID của JVM với OS thread ID qua <code>top -H</code> → convert TID sang hex.
- ✦ Deadlock: <code>jstack</code> tự báo cáo "Found one Java-level deadlock" kèm thông tin chi tiết.

*Chẩn đoán CPU cao và phát hiện deadlock*
```java
# Bước 1: tìm OS thread nào đang ngốn CPU
top -H -p 12345
# Ghi lại PID của thread nóng, ví dụ 12350

# Bước 2: chuyển PID sang hex (JVM dùng hex cho nid)
printf '%x
' 12350   # → 303e

# Bước 3: tìm trong thread dump
jstack 12345 | grep -A 30 "nid=0x303e"
# Output:
# "http-nio-8080-exec-5" #42 daemon prio=5 tid=... nid=0x303e runnable
#    java.lang.Thread.State: RUNNABLE
#    at com.example.OrderService.calculateDiscount(OrderService.java:87)

# Deadlock trong jstack output:
# Found one Java-level deadlock:
# "Thread-1": waiting to lock <0x000...> held by "Thread-2"
# "Thread-2": waiting to lock <0x000...> held by "Thread-1"

# Nhiều thread BLOCKED — tìm thread giữ lock gây tắc
jstack 12345 | grep -A 5 "BLOCKED"
# "- waiting to lock <0xabc> (owned by "Thread-pool-1-exec-1")"
# → Thread-pool-1-exec-1 là bottleneck — xem nó đang làm gì
```

### 💡 Lời khuyên thực tế

Khi thấy CPU cao: 1) `top -H` tìm thread nóng, 2) convert TID sang hex, 3) grep thread dump. Khi response chậm mà CPU bình thường: tìm thread BLOCKED. Hầu hết "CPU spike" trong Java thực ra là GC pressure (kiểm tra `jstat -gcutil`) hoặc vòng lặp dày trong business logic. I/O mạng/DB thấy là RUNNABLE với native I/O trong stack trace.

### ❓ Câu hỏi phỏng vấn

- **Q:** Tương quan thread OS CPU cao với Java stack trace thế nào?
- **Q:** BLOCKED trong thread dump có nghĩa gì?
- **Q:** Xác nhận deadlock từ thread dump thế nào?
