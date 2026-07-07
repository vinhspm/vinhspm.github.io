# Blocking I/O — java.io

**Breadcrumb:** 1. Core Java › Java I/O

> java.io là blocking và dựa trên stream: mỗi lệnh read/write block thread hiện tại cho đến khi có data. Áp dụng Decorator pattern — bọc stream để thêm buffering, encoding, nén.

## Các điểm chính

- ✦ **Byte streams**: <code>InputStream / OutputStream</code> cho raw bytes. Cho file: <code>FileInputStream / FileOutputStream</code>.
- ✦ **Char streams**: <code>Reader / Writer</code> cho Unicode text. Cho file: <code>FileReader / FileWriter</code>.
- ✦ **Buffered wrappers**: <code>BufferedReader / BufferedWriter</code> gom nhiều system call thành batch — tăng hiệu năng đáng kể.
- ✦ Luôn dùng <code>try-with-resources</code> — đảm bảo <code>close()</code> được gọi dù có exception.
- ✦ Decorator chain: <code>new BufferedReader(new InputStreamReader(new FileInputStream("f.txt"), StandardCharsets.UTF_8))</code>.

*Đọc/ghi text có buffer và copy binary*
```java
// Đọc file text từng dòng (có buffer)
try (BufferedReader br = new BufferedReader(
         new InputStreamReader(new FileInputStream("data.txt"), StandardCharsets.UTF_8))) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
}

// Ghi file text
try (BufferedWriter bw = new BufferedWriter(new FileWriter("out.txt"))) {
    bw.write("Hello, World!");
    bw.newLine();
}

// Copy file binary (buffer 8 KB)
try (InputStream in  = new FileInputStream("src.bin");
     OutputStream out = new FileOutputStream("dst.bin")) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
}
```

### 💡 Lời khuyên thực tế

Ưu tiên `Files.readAllLines()` cho file nhỏ và `Files.lines()` (lazy Stream) cho file lớn — cả hai là NIO.2 wrappers tiện lợi tự xử lý encoding và đóng stream. Luôn bọc `FileReader` bằng `BufferedReader` — không có buffer, mỗi `readLine()` gọi nhiều system call.

### ❓ Câu hỏi phỏng vấn

- **Q:** Byte stream và char stream khác nhau thế nào?
- **Q:** BufferedReader bổ sung gì cho FileReader?
- **Q:** Điều gì xảy ra nếu quên đóng stream?
