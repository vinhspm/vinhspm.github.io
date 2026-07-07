# Tổng Quan Java I/O

**Breadcrumb:** 1. Core Java

> Java cung cấp hai package I/O: <code>java.io</code> (blocking, dựa trên stream) và <code>java.nio</code> (non-blocking, dựa trên buffer/channel). NIO.2 (<code>java.nio.file</code>) hiện đại hóa các thao tác file. Hiểu cả ba là nền tảng để xử lý file, network và xây dựng ứng dụng hiệu năng cao.

## Các điểm chính

- ✦ **java.io**: Dựa trên stream, blocking. InputStream/OutputStream cho bytes; Reader/Writer cho ký tự.
- ✦ **java.nio**: Mô hình Buffer + Channel. Hỗ trợ non-blocking và Selector để multiplexing.
- ✦ **NIO.2** (Java 7+): package <code>java.nio.file</code> — Path, Files, WatchService cho thao tác file hiện đại.
- ✦ Blocking I/O: một thread một kết nối — đơn giản nhưng không scale quá ~10K kết nối đồng thời.
- ✦ NIO Selector: một thread giám sát nhiều channel — nền tảng của Netty và các server high-concurrency.
- ✦ Java 21 Virtual Threads: viết code blocking nhưng scale như NIO — tốt nhất cả hai thế giới.

### 💡 Lời khuyên thực tế

Trong Spring Boot ít khi viết raw I/O. Nhưng cần hiểu: `MultipartFile.getInputStream()` dùng java.io; Spring WebFlux (Netty) dùng NIO selector. Với file lớn, dùng `Files.lines(path)` — stream lazy, bộ nhớ không tăng theo kích thước file.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa java.io và java.nio là gì?
- **Q:** Khi nào nên dùng NIO thay vì Blocking I/O?
- **Q:** Selector trong Java NIO có vai trò gì?
