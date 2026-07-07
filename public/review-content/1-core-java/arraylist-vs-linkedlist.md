# ArrayList vs LinkedList

**Breadcrumb:** 1. Core Java › Collections

> ArrayList được hỗ trợ bởi dynamic array (truy cập ngẫu nhiên nhanh, insert giữa chậm); LinkedList là doubly-linked list (insert giữa nhanh, truy cập ngẫu nhiên chậm, overhead bộ nhớ cao).

## Các điểm chính

- ✦ <code>ArrayList</code>: get theo index O(1), insert/delete ở giữa O(n), add cuối amortized O(1).
- ✦ <code>LinkedList</code>: get theo index O(n), insert/delete O(1) khi có <code>ListIterator</code>, nhưng phải duyệt.
- ✦ LinkedList tốn ~40 byte mỗi node (dữ liệu + hai con trỏ) — overhead bộ nhớ cao hơn nhiều.
- ✦ Trong thực tế, **ArrayList thắng hầu hết trường hợp** do CPU cache locality.
- ✦ <code>LinkedList</code> hữu ích như <code>Deque</code> (hàng đợi hai đầu) — nhưng <code>ArrayDeque</code> thường tốt hơn ngay cả ở đó.
- ✦ Cả hai không thread-safe; dùng <code>CopyOnWriteArrayList</code> cho đọc đồng thời.

*ArrayList vs LinkedList: internal model, use cases, và ArrayDeque recommendation*
```java
import java.util.*;

// ---- ArrayList internal model ----
// Backed by Object[] array. add(E) at end → amortized O(1) (resize doubles capacity).
// get(index) → O(1) direct array access.
// add(0, e) / remove(0) → O(n) because it shifts all elements right.

// ---- LinkedList internal model ----
// Each node: {prev, data, next} — ~40 bytes of object overhead per element.
// addFirst / addLast → O(1) pointer update.
// get(index) → O(n) traversal from head or tail.
// Poor CPU cache locality: nodes scattered on heap, no sequential memory access.

public class OrderQueueDemo {

    // Use case 1: read-heavy list → ArrayList wins
    public BigDecimal calculateOrderTotal(String orderId) {
        // Fetched once, iterated multiple times → ArrayList ideal
        List<OrderItem> items = orderRepository.findItems(orderId); // returns ArrayList
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < items.size(); i++) {      // O(1) each get(i)
            total = total.add(items.get(i).totalPrice());
        }
        return total;
    }

    // Use case 2: frequent head removal → LinkedList as Deque (or ArrayDeque, even better)
    public void processOrderQueue() {
        // LinkedList as a queue — O(1) addLast and removeFirst
        Deque<Order> queue = new LinkedList<>();
        loadPendingOrders().forEach(queue::addLast);

        while (!queue.isEmpty()) {
            Order next = queue.removeFirst();  // O(1)
            processOrder(next);
        }
    }

    // Use case 3: Real-world recommendation — use ArrayDeque, not LinkedList
    public void processOrderQueueBetter() {
        // ArrayDeque: O(1) head/tail ops + better cache locality than LinkedList
        Deque<Order> queue = new ArrayDeque<>(loadPendingOrders());
        while (!queue.isEmpty()) {
            processOrder(queue.poll());
        }
    }

    // Quick benchmark illustration (approximate, JVM warm-up matters)
    public static void benchmark() {
        int N = 50_000;
        List<Order> arr  = new ArrayList<>();
        Deque<Order> deq = new ArrayDeque<>();

        // Prepend to ArrayList: O(n) per op → O(n²) total — very slow
        long t = System.nanoTime();
        for (int i = 0; i < N; i++) arr.add(0, new Order(String.valueOf(i), "C1"));
        System.out.printf("ArrayList prepend %,d times: %dms%n", N, (System.nanoTime()-t)/1_000_000);

        // Prepend to ArrayDeque: O(1) per op → O(n) total — fast
        t = System.nanoTime();
        for (int i = 0; i < N; i++) deq.addFirst(new Order(String.valueOf(i), "C1"));
        System.out.printf("ArrayDeque prepend %,d times: %dms%n", N, (System.nanoTime()-t)/1_000_000);
        // Typical: ArrayList ~2000ms vs ArrayDeque ~5ms for 50K prepends
    }
}
```

### 💡 Lời khuyên thực tế

Mặc định dùng `ArrayList`. Chỉ dùng `LinkedList` nếu có use case queue/deque rõ ràng và đã benchmark. Với list thread-safe đọc nhiều ghi ít, dùng `CopyOnWriteArrayList`.

### ❓ Câu hỏi phỏng vấn

- **Q:** Độ phức tạp thời gian của get(index) trong ArrayList vs LinkedList là gì?
- **Q:** Tại sao ArrayList thường nhanh hơn LinkedList dù độ phức tạp insert về lý thuyết tệ hơn?
- **Q:** Khi nào bạn dùng LinkedList thay vì ArrayList?
