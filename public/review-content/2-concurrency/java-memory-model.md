# Java Memory Model (JMM)

**Breadcrumb:** 2. Concurrency

> JMM định nghĩa cách thread tương tác qua memory — cụ thể giá trị nào một lần đọc được phép thấy — qua quan hệ happens-before và synchronization action.

## Các điểm chính

- ✦ JMM cho phép CPU/compiler sắp xếp lại lệnh để tối ưu, trừ khi bị ràng buộc bởi happens-before.
- ✦ **happens-before**: nếu A happens-before B, thì ghi của A hiển thị với B.
- ✦ Nguồn của happens-before: release/acquire <code>synchronized</code>, ghi/đọc <code>volatile</code>, <code>Thread.start()</code>/<code>join()</code>.
- ✦ Không có synchronization, thread có thể thấy object cũ hoặc chưa được khởi tạo đầy đủ.
- ✦ Safe publication: object được publish an toàn khi tham chiếu của nó được chia sẻ qua cơ chế đồng bộ hóa.

*JMM: partial construction hazard, volatile for config + safe publication via final*
```java
// ---- Java Memory Model: why shared mutable state is dangerous ----
//
// JMM allows CPU and compiler to:
//  1. Cache variable values in CPU registers / L1-L2 cache (visibility problem)
//  2. Reorder instructions for performance (ordering problem)
//
// Without explicit synchronization, threads CAN see stale or partially-written state.

// ---- Example 1: partially constructed Order ----
// Thread A (writer):         Thread B (reader):
// order = new Order(...);    if (order != null) {
//                                process(order.getTotal()); // MAY crash!
//                            }
//
// Why: CPU may publish 'order' reference BEFORE fully constructing the object.
// Thread B sees non-null reference but reads uninitialized fields → NPE or corrupt data.

// FIX 1: volatile reference ensures full construction is visible before reference is published
public class OrderPublisher {
    private volatile Order latestOrder = null;    // volatile: write barriers around assignment

    public void publishOrder(Order order) {
        // All writes to 'order' fields happen-before the volatile write of 'latestOrder'
        this.latestOrder = order;   // volatile write — flushes all previous writes to main memory
    }

    public Order getLatestOrder() {
        return latestOrder;         // volatile read — sees the fully constructed order
    }
}

// ---- Example 2: configuration reload — stale read ----
public class OrderConfig {
    // Without volatile: worker threads may cache this in CPU register
    // and never see the updated value even after admin thread writes it
    private volatile double taxRate = 0.1;

    // Admin thread: called once when config changes
    public void setTaxRate(double rate) {
        this.taxRate = rate;   // volatile write: visible to ALL threads immediately
    }

    // Worker threads: called for every order calculation
    public double getTaxRate() {
        return taxRate;        // volatile read: always reads from main memory
    }
}

// ---- Example 3: initialization published unsafely (BROKEN) ----
class UnsafeOrderCache {
    private List<Order> cache;                     // NOT volatile

    public void init() {
        cache = loadAllOrders();                   // Thread A writes
    }

    public List<Order> getCache() {
        return cache;                              // Thread B may see null or partial list!
    }
}

// FIX 2: final field — JMM guarantees final fields are fully visible after constructor
class SafeOrderCache {
    private final List<Order> cache;               // final: safe publication guarantee

    public SafeOrderCache() {
        this.cache = loadAllOrders();              // written once in constructor
    }                                              // all writes visible to any reader after construction

    public List<Order> getCache() { return cache; }
}
```

### 💡 Lời khuyên thực tế

JMM là lý do bạn cần `volatile` hoặc synchronization ngay cả cho flag đơn giản. Khi nghi ngờ, dùng cấu trúc cấp cao (`AtomicReference`, `ConcurrentHashMap`) vốn đã có đảm bảo JMM theo thiết kế.

### ❓ Câu hỏi phỏng vấn

- **Q:** Quan hệ happens-before đảm bảo điều gì?
- **Q:** Safe publication là gì và tại sao quan trọng?
- **Q:** JVM có thể sắp xếp lại lệnh bên trong synchronized block không?
