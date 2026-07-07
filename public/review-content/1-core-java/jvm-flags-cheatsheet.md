# JVM Flags Cheatsheet

**Breadcrumb:** 1. Core Java › Performance Tuning

> Các JVM flag quan trọng cho heap sizing, chọn GC, logging và diagnostics. Cần thuộc các flag thường dùng và default trong production.

## Các điểm chính

- ✦ **Heap**: <code>-Xms</code> (initial), <code>-Xmx</code> (max). Đặt bằng nhau trong production để tránh overhead resize.
- ✦ **GC**: <code>-XX:+UseG1GC</code> (default Java 9+). <code>-XX:+UseZGC</code> (Java 15+ production, pause dưới 1ms).
- ✦ <code>-XX:MaxGCPauseMillis=200</code>: mục tiêu pause của G1 (best-effort). Giảm xuống cho service nhạy cảm latency.
- ✦ **GC logging (Java 11+)**: <code>-Xlog:gc*:file=/logs/gc.log:time,uptime:filecount=5,filesize=20m</code>.
- ✦ <code>-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs/</code>: tự dump khi OOM. Luôn bật trong production.
- ✦ <code>-XX:+ExitOnOutOfMemoryError</code>: crash ngay khi OOM để Kubernetes/systemd restart sạch sẽ.
- ✦ <code>-XX:+UseContainerSupport</code>: detect đúng CPU/memory trong Docker/K8s (mặc định Java 8u191+).

*JVM startup flags cho production*
```java
# Startup production — Spring Boot JAR
java   -server   -Xms2g -Xmx2g   -XX:+UseG1GC   -XX:MaxGCPauseMillis=200   -XX:G1HeapRegionSize=16m   -XX:+HeapDumpOnOutOfMemoryError   -XX:HeapDumpPath=/var/log/app/   -XX:+ExitOnOutOfMemoryError   -Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20m   -Dfile.encoding=UTF-8   -Dspring.profiles.active=prod   -jar app.jar

# Quy tắc trong container:
# -Xmx = ~75% memory limit của container
#   (để lại room cho Metaspace, native memory, OS)
# -XX:+UseContainerSupport đã mặc định (Java 8u191+)

# ZGC cho latency cực thấp (Java 17+):
# -XX:+UseZGC -XX:SoftMaxHeapSize=4g

# Xem flags đang dùng của JVM đang chạy
jcmd 12345 VM.flags
```

### 💡 Lời khuyên thực tế

Trong Kubernetes: không đặt `-Xmx` = 100% memory container — JVM cần headroom cho Metaspace, compiler buffer, OS memory. 75% là điểm khởi đầu an toàn. Dùng `-XX:+ExitOnOutOfMemoryError` để Kubernetes restart pod ngay thay vì app tiếp tục chạy yếu.

### ❓ Câu hỏi phỏng vấn

- **Q:** -Xms và -Xmx tại sao nên đặt bằng nhau trong production?
- **Q:** Khi nào dùng ZGC thay vì G1GC?
- **Q:** -XX:+UseContainerSupport làm gì?
