# NIO.2 — API Path & Files

**Breadcrumb:** 1. Core Java › Java I/O

> NIO.2 (Java 7, package java.nio.file) hiện đại hóa thao tác file với Path (bất biến, đa nền tảng), Files (các method tiện ích phong phú), và WatchService (theo dõi thay đổi thư mục).

## Các điểm chính

- ✦ <code>Path.of("dir/file.txt")</code>: path độc lập nền tảng. <code>Paths.get()</code> là cách cũ tương đương.
- ✦ <code>Files.readAllLines(path)</code>, <code>Files.readAllBytes(path)</code>: tiện lợi cho file nhỏ.
- ✦ <code>Files.lines(path)</code>: <code>Stream&lt;String&gt;</code> lazy — hiệu quả cho file lớn. Phải đóng stream sau khi dùng!
- ✦ <code>Files.walk(path)</code>: duyệt thư mục đệ quy dưới dạng <code>Stream&lt;Path&gt;</code>.
- ✦ <code>WatchService</code>: theo dõi sự kiện CREATE / MODIFY / DELETE trong thư mục mà không cần polling.

*Files.lines, Files.walk, WatchService*
```java
// Đọc tất cả dòng (file nhỏ)
List<String> lines = Files.readAllLines(Path.of("config.txt"), StandardCharsets.UTF_8);

// Stream file lớn — bộ nhớ không tăng theo kích thước file
try (Stream<String> stream = Files.lines(Path.of("huge.log"))) {
    stream.filter(l -> l.contains("ERROR"))
          .forEach(System.out::println);
} // stream tự đóng

// Copy với ghi đè
Files.copy(Path.of("src.txt"), Path.of("dst.txt"), StandardCopyOption.REPLACE_EXISTING);

// Duyệt thư mục — tìm tất cả file .java
try (Stream<Path> walk = Files.walk(Path.of("src/main"))) {
    List<Path> javaFiles = walk
        .filter(p -> p.toString().endsWith(".java"))
        .collect(Collectors.toList());
}

// Theo dõi thư mục thay đổi
WatchService watcher = FileSystems.getDefault().newWatchService();
Path dir = Path.of("/data/uploads");
dir.register(watcher, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);
WatchKey key = watcher.take(); // block đến khi có sự kiện
for (WatchEvent<?> event : key.pollEvents()) {
    System.out.println(event.kind() + ": " + event.context());
}
```

### 💡 Lời khuyên thực tế

Dùng `Files.lines()` để xử lý log file — stream lazy nên bộ nhớ không đổi dù file bao lớn. Luôn wrap trong try-with-resources để đóng stream. `WatchService` là nền tảng của hot-reload config trong Spring Cloud Config. Trong Spring Batch, `Files.walk()` tiện để xử lý thư mục chứa file input.

### ❓ Câu hỏi phỏng vấn

- **Q:** Khác nhau giữa Files.readAllLines() và Files.lines()?
- **Q:** Xử lý file log 10 GB không bị OutOfMemoryError thế nào?
- **Q:** WatchService dùng để làm gì trong Java?
