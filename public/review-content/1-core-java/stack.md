# JVM Stack

**Breadcrumb:** 1. Core Java › JVM Internals

> Mỗi thread có JVM Stack riêng chứa các frame (một frame mỗi lần gọi method) lưu local variable, operand stack và địa chỉ return — tồn tại độc lập với heap.

## Các điểm chính

- ✦ Stack là per-thread; heap được chia sẻ. Stack variable mặc định thread-safe.
- ✦ Mỗi frame chứa: mảng local variable, operand stack, tham chiếu constant pool, return value.
- ✦ Gọi method push frame; return pop frame — cấu trúc LIFO.
- ✦ <code>StackOverflowError</code>: vượt quá độ sâu stack — thường do đệ quy sâu/vô hạn.
- ✦ <code>-Xss</code> đặt kích thước stack mỗi thread (mặc định ~512KB–1MB tùy platform).
- ✦ Kiểu nguyên thủy và tham chiếu sống trên stack; object chúng tham chiếu sống trên heap.

*Stack frame lifecycle: recursive OOM vs iterative fix + stack vs heap ownership*
```java
// ---- Stack frame anatomy ----
// Each method call pushes ONE frame onto the current thread's stack.
// Frame holds: local variables array, operand stack, reference to constant pool.
// Frame is popped when the method returns (or throws).

public class OrderTreeProcessor {

    // BAD: recursive descent without depth guard → StackOverflowError on deep category trees
    public BigDecimal sumRecursive(CategoryNode node) {
        // Every call = 1 frame pushed; deep tree exhausts -Xss budget
        if (node == null) return BigDecimal.ZERO;
        BigDecimal subtotal = node.getProducts().stream()
            .map(Product::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        return node.getChildren().stream()
            .map(this::sumRecursive)          // each child = another frame
            .reduce(subtotal, BigDecimal::add);
    }

    // GOOD: iterative with explicit stack — O(depth) memory on heap, not JVM stack
    public BigDecimal sumIterative(CategoryNode root) {
        Deque<CategoryNode> stack = new ArrayDeque<>();
        stack.push(root);
        BigDecimal total = BigDecimal.ZERO;

        while (!stack.isEmpty()) {
            CategoryNode node = stack.pop();
            total = node.getProducts().stream()
                .map(Product::getPrice)
                .reduce(total, BigDecimal::add);
            node.getChildren().forEach(stack::push);  // children queued, not recursed
        }
        return total;
    }

    // Coexistence demo: stack vs heap ownership
    public Order buildOrder(String customerId) {
        // 'customerId' ref lives on stack (local variable in this frame)
        // The actual String object lives on HEAP
        String id = UUID.randomUUID().toString(); // id ref: stack; String: heap
        List<OrderItem> items = new ArrayList<>(); // items ref: stack; ArrayList: heap
        return new Order(id, customerId, items);   // Order object: heap; returned to caller
    }
}

// ---- Tune thread stack size ----
// Default ~512KB–1MB per thread; large thread pools → significant memory
// java -Xss256k MyApp   (reduce if threads are shallow; increase if deep recursion needed)
// 500 threads × 1MB stack = 500MB before a single heap byte is allocated!
```

### 💡 Lời khuyên thực tế

Virtual thread (Java 21+) có stack rất nhỏ và được JVM quản lý, không phải OS — chúng có thể block mà không tốn platform thread stack. Điều này thay đổi mô hình kinh tế của thread-per-request.

### ❓ Câu hỏi phỏng vấn

- **Q:** JVM stack và heap lưu gì?
- **Q:** Nguyên nhân StackOverflowError và cách sửa?
- **Q:** Tại sao local variable thread-safe?
