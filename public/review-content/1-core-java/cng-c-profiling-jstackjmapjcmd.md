# Công Cụ Profiling: jstack / jmap / jcmd

**Breadcrumb:** 1. Core Java › Performance Tuning

> JDK đi kèm các công cụ chẩn đoán tích hợp — jstack (thread dump), jmap (heap info/dump), jcmd (đa năng), jstat (GC stats). async-profiler và Arthas cung cấp profiling sâu hơn với overhead tối thiểu.

## Các điểm chính

- ✦ <code>jstack &lt;pid&gt;</code>: thread dump — trạng thái tất cả thread (RUNNABLE/BLOCKED/WAITING) và stack trace. Phát hiện deadlock.
- ✦ <code>jmap -heap &lt;pid&gt;</code>: heap summary. <code>jmap -dump:live,format=b,file=h.hprof &lt;pid&gt;</code>: snapshot heap đầy đủ.
- ✦ <code>jcmd &lt;pid&gt; help</code>: liệt kê lệnh có sẵn. <code>jcmd &lt;pid&gt; GC.heap_info</code>, <code>VM.flags</code>, <code>Thread.print</code>.
- ✦ <code>jstat -gcutil &lt;pid&gt; 1000</code>: GC stats mỗi 1 giây (% dùng S0/S1/Eden/Old, số lần GC và thời gian).
- ✦ **async-profiler**: CPU flame graph, allocation profiling, lock profiling. Dùng perf_events — an toàn production, không có safepoint bias.
- ✦ **Arthas** (Alibaba): trace method call, xem parameters, decompile class đang chạy. Rất hữu ích chẩn đoán production không cần redeploy.

*Cheatsheet lệnh chẩn đoán*
```java
# 1. Tìm PID của Java process
jps -l
# hoặc: ps aux | grep java

# 2. Thread dump (lấy 2-3 lần cách nhau 5-10s)
jstack 12345 > thread1.txt && sleep 5 && jstack 12345 > thread2.txt

# 3. GC monitoring (mỗi giây)
jstat -gcutil 12345 1000
# Output: S0  S1  E   O    M   CCS YGC  YGCT FGC FGCT  GCT
#          0  63  25  45  96   92  187  4.2   2  1.8  6.0

# 4. Heap dump (live = bỏ qua object không thể reach)
jmap -dump:live,format=b,file=/tmp/heap.hprof 12345
# Hoặc tự động khi OOM: -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs/

# 5. async-profiler — CPU flame graph 30 giây
./profiler.sh -d 30 -f /tmp/flame.html 12345

# 6. Arthas — trace method chậm (>100ms)
java -jar arthas-boot.jar 12345
[arthas]$ trace com.example.OrderService placeOrder '#cost > 100'
[arthas]$ watch com.example.OrderService placeOrder '{params, returnObj}' -x 2
```

### 💡 Lời khuyên thực tế

Trong production: bật `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs/` khi startup để tự động capture heap dump khi OOM. Dùng `jstat -gcutil` mỗi giây để xem GC pressure thời gian thực. async-profiler an toàn production (không có overhead safepoint polling). Arthas lý tưởng khi không thể redeploy — instrument code đang chạy mà không cần restart.

### ❓ Câu hỏi phỏng vấn

- **Q:** Tìm thread nào đang ngốn 100% CPU bằng jstack thế nào?
- **Q:** jstat -gcutil cho biết gì?
- **Q:** Khi nào dùng async-profiler thay vì jmap?
