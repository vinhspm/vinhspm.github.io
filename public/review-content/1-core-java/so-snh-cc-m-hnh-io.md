# So Sánh Các Mô Hình I/O

**Breadcrumb:** 1. Core Java › Java I/O

> Java hỗ trợ bốn mô hình I/O: Blocking (java.io), Non-Blocking NIO (selector), Asynchronous NIO2 (AsynchronousChannel), và Virtual Threads (Java 21). Hiểu trade-off giúp chọn đúng approach.

## Các điểm chính

- ✦ **Blocking I/O**: thread block đến khi có data. Code đơn giản, scale kém (thread-per-connection).
- ✦ **Non-Blocking NIO**: selector poll nhiều channel. Một thread xử lý nghìn kết nối. Code phức tạp hơn.
- ✦ **Async NIO2**: <code>AsynchronousFileChannel</code> — completion handler gọi khi I/O xong. Dựa trên callback, phức tạp.
- ✦ **Virtual Threads (Java 21)**: code blocking style; JVM tháo carrier thread khi I/O wait. Code đơn giản + concurrency cao.
- ✦ Spring WebFlux: reactive streams qua Netty NIO — non-blocking tường minh nhưng mô hình reactive phức tạp.
- ✦ Spring MVC trên Virtual Threads (Java 21): đơn giản hơn WebFlux, vẫn xử lý concurrency cao — ưu tiên cho project mới.

*Blocking vs WebFlux vs Virtual Threads*
```java
// Cách 1: Blocking truyền thống (đơn giản, scale giới hạn)
@GetMapping("/data")
String data() throws Exception {
    return Files.readString(Path.of("big.txt")); // block carrier thread
}

// Cách 2: Spring WebFlux (non-blocking, reactive — phức tạp)
@GetMapping("/data")
Mono<String> data() {
    return Mono.fromCallable(() -> Files.readString(Path.of("big.txt")))
               .subscribeOn(Schedulers.boundedElastic());
}

// Cách 3: Virtual Threads (Java 21) — tốt nhất cả hai
// application.properties: spring.threads.virtual.enabled=true
// Code blocking y hệt cách 1, nhưng JVM tự chuyển sang virtual thread.

// Hoặc cấu hình thủ công:
@Bean
TomcatProtocolHandlerCustomizer<?> useVirtualThreads() {
    return handler ->
        handler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
}
```

### 💡 Lời khuyên thực tế

Cho project Java 21+ mới: dùng Virtual Threads với Spring MVC truyền thống — concurrency cao mà không cần reactive programming phức tạp. Chỉ dùng WebFlux khi cần backpressure hoặc streaming (Server-Sent Events, response lớn). Biết tất cả mô hình để thảo luận kiến trúc trong phỏng vấn — interviewer kiểm tra hiểu tại sao chọn mỗi loại.

### ❓ Câu hỏi phỏng vấn

- **Q:** Khi nào chọn WebFlux thay vì Spring MVC?
- **Q:** Virtual Threads giải quyết vấn đề thread-per-connection thế nào?
- **Q:** Sự khác nhau giữa non-blocking I/O và asynchronous I/O?
