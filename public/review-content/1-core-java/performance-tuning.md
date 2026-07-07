# Tuning Hiệu Năng JVM

**Breadcrumb:** 1. Core Java

> Tuning hiệu năng là xác định đúng bottleneck (CPU, bộ nhớ, I/O, lock) bằng công cụ profiling, rồi áp dụng fix chính xác. Không bao giờ optimize mà không đo trước.

## Các điểm chính

- ✦ **Đo trước, optimize sau**: hầu hết vấn đề hiệu năng nằm ở query DB, không phải code Java.
- ✦ **CPU bottleneck**: method nóng (flame graph), vòng lặp dày, tạo nhiều object gây GC pressure.
- ✦ **Memory bottleneck**: heap leak (tăng dần đến OOM), live set lớn gây GC pause dài.
- ✦ **I/O bottleneck**: query DB chậm (slow query log + EXPLAIN), network latency, thiếu connection pool.
- ✦ **Lock contention**: thread dump thấy nhiều thread BLOCKED chờ cùng một monitor.
- ✦ Công cụ: <code>jstack</code>, <code>jmap</code>, <code>jcmd</code>, <code>jstat</code>, **async-profiler** (an toàn production), **Arthas** (Alibaba).

### 💡 Lời khuyên thực tế

Trong phỏng vấn, mô tả quy trình hệ thống: 1) Quan sát triệu chứng (CPU cao? bộ nhớ tăng? latency?), 2) Thu thập dữ liệu (thread dump / heap dump / GC log), 3) Xác định root cause, 4) Apply fix có mục tiêu, 5) Đo lại để xác nhận. Đừng chỉ nói "tôi tune JVM" mà không nói đã thay đổi gì và cải thiện bao nhiêu.

### ❓ Câu hỏi phỏng vấn

- **Q:** Mô tả cách chẩn đoán CPU cao trong ứng dụng Java.
- **Q:** Heap dump và thread dump khác nhau thế nào?
- **Q:** Làm sao xác định method nào đang ngốn CPU nhất?
