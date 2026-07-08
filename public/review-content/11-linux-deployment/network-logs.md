# Lệnh Network & Log

**Breadcrumb:** 11. Linux & Deployment

> Lệnh chẩn đoán network để kiểm tra port và kết nối; công cụ phân tích log để monitoring thời gian thực và tìm pattern trong production — kỹ năng core để tự troubleshoot deployment.

## Các điểm chính

- ✦ <code>ss -lntp</code>: liệt kê tất cả TCP port đang listen với process name (thay thế hiện đại cho <code>netstat -tulnp</code>).
- ✦ <code>lsof -i :8080</code>: process nào đang dùng port 8080.
- ✦ <code>curl -v http://localhost:8080/actuator/health</code>: test HTTP endpoint verbose.
- ✦ <code>telnet db-host 3306</code>: test kết nối TCP đến port DB.
- ✦ <code>tail -f /var/log/app/app.log</code>: theo dõi log live.
- ✦ <code>grep -n "ERROR" app.log</code>: tìm error. <code>grep -C 5 "Exception"</code>: 5 dòng context.
- ✦ <code>awk '{print $NF}' access.log | sort -n | tail -20</code>: extract và sort field cuối (ví dụ response time).

*Lệnh chẩn đoán network và phân tích log*
```java
# Kiểm tra port
ss -lntp                           # tất cả port đang listen + process
ss -lntp | grep 8080               # port 8080 có được dùng không?
lsof -i :8080                      # PID nào đang dùng port 8080

# Test kết nối
curl -v http://localhost:8080/actuator/health   # HTTP test (verbose)
curl -o /dev/null -s -w "%{http_code}
" http://localhost:8080/  # chỉ lấy status code
telnet db-host 3306                # test kết nối DB port (Ctrl+] để thoát)
ping -c 4 gateway-service          # ICMP reachability

# Summary trạng thái connection (kiểm tra TIME_WAIT tích lũy)
ss -s

# Monitor log realtime
tail -f /var/log/app/app.log                       # tất cả output
tail -f /var/log/app/app.log | grep --line-buffered "ERROR"   # chỉ error

# Phân tích log
grep -n "NullPointerException" app.log             # tìm kèm số dòng
grep -C 10 "OutOfMemoryError" app.log              # 10 dòng context
grep "2024-01-15 14:" app.log | grep -c "ERROR"    # đếm error lúc 2pm

# Phân tích slow request trong nginx access log
awk '$NF > 1.0 {print}' /var/log/nginx/access.log    # request > 1s
awk '{sum+=$NF; cnt++} END{print "avg:", sum/cnt}' access.log  # avg response time
```

### 💡 Lời khuyên thực tế

`tail -f | grep --line-buffered` là cách nhanh nhất xem error live. Flag `--line-buffered` ngăn grep buffer output khi pipe. Quy trình chẩn đoán outage production: 1) `curl /actuator/health` kiểm tra trạng thái app, 2) `tail -f app.log | grep ERROR` xem error hiện tại, 3) `ss -s` kiểm tra connection state (nhiều TIME_WAIT = connection leak hoặc surge traffic), 4) `top` kiểm tra CPU/memory.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Kiểm tra process nào đang dùng port 8080 thế nào?</b></summary>

Sử dụng lệnh `lsof -i :8080` hoặc `netstat -tunlp | grep 8080` để tìm ra PID của process đang chiếm giữ port.
</details>

<details>
<summary><b>Q: Nhiều TIME_WAIT connection trong ss -s cho thấy gì?</b></summary>

Cho thấy ứng dụng đang mở/đóng rất nhiều kết nối TCP ngắn hạn liên tục (short-lived connections) thay vì sử dụng cơ chế Keep-Alive hoặc Connection Pool, gây lãng phí tài nguyên socket của hệ điều hành.
</details>

<details>
<summary><b>Q: Xem live log nhưng chỉ filter dòng ERROR thế nào?</b></summary>

Sử dụng lệnh `tail -f app.log | grep --line-buffered "ERROR"`.
</details>
