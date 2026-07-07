# Đồng Bộ Hóa (Synchronization)

**Breadcrumb:** 2. Concurrency

> Synchronization đảm bảo chỉ một thread tại một thời điểm thực thi critical section, sử dụng monitor (intrinsic lock) qua từ khóa <code>synchronized</code> hoặc đối tượng <code>Lock</code> tường minh.

## Các điểm chính

- ✦ <code>synchronized</code> trên instance method: lock <code>this</code>. Trên static method: lock đối tượng <code>Class</code>.
- ✦ <code>synchronized(obj) { ... }</code>: đồng bộ hóa trên bất kỳ object nào làm monitor.
- ✦ Mọi Java object đều có intrinsic lock (monitor); <code>synchronized</code> lấy nó.
- ✦ <code>ReentrantLock</code>: ngữ nghĩa giống nhưng thêm <code>tryLock()</code>, <code>lockInterruptibly()</code> và fairness.
- ✦ Synchronization có overhead: context switch, memory barrier, cache coherence traffic.
- ✦ Ưu tiên cấu trúc cấp cao (<code>ConcurrentHashMap</code>, <code>AtomicLong</code>) thay vì tự đồng bộ hóa.

*Synchronization: method-level vs block-level + dedicated lock objects + static lock*
```java
import java.util.*;
import java.math.BigDecimal;

// ---- Synchronization at different granularities ----
public class OrderInventoryManager {
    private final Map<String, Integer> stock = new HashMap<>();      // productId → qty
    private final Map<String, BigDecimal> prices = new HashMap<>();  // productId → price
    private final Object stockLock  = new Object();   // dedicated lock for stock
    private final Object priceLock  = new Object();   // separate lock for prices

    // Method-level lock (coarse): locks entire object for the whole method
    // Use when: method touches MULTIPLE fields that form a single invariant
    public synchronized boolean transferStock(String fromProduct, String toProduct, int qty) {
        int fromQty = stock.getOrDefault(fromProduct, 0);
        if (fromQty < qty) return false;   // check-then-act — must be atomic
        stock.put(fromProduct, fromQty - qty);
        stock.put(toProduct, stock.getOrDefault(toProduct, 0) + qty);
        return true;
    }

    // Block-level lock (fine-grained): only lock around the critical section
    // Allows stock and price updates to proceed CONCURRENTLY
    public void updateStock(String productId, int delta) {
        synchronized (stockLock) {         // lock only stock — not prices
            int current = stock.getOrDefault(productId, 0);
            if (current + delta < 0)
                throw new IllegalArgumentException("Stock cannot go negative: " + productId);
            stock.put(productId, current + delta);
        }
        // Price lock is free during stock update — higher concurrency
    }

    public void updatePrice(String productId, BigDecimal newPrice) {
        synchronized (priceLock) {         // independent of stock lock
            prices.put(productId, newPrice);
        }
    }

    // Static synchronized: locks the CLASS object, not 'this'
    // Use for static shared state (e.g., global counter)
    private static int totalOrdersProcessed = 0;
    public static synchronized void recordProcessed() {
        totalOrdersProcessed++;    // lock is OrderInventoryManager.class
    }

    // Read lock pitfall: need to sync reads too if writes are synchronized
    public int getStock(String productId) {
        synchronized (stockLock) {         // MUST sync — HashMap not thread-safe for reads under concurrent writes
            return stock.getOrDefault(productId, 0);
        }
    }
}
```

### 💡 Lời khuyên thực tế

Với counter đơn giản, dùng `AtomicInteger` thay vì synchronized method. Với invariant phức tạp liên quan nhiều field, dùng `ReentrantLock` để giữ lock qua nhiều thao tác một cách atomic.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa synchronized method và synchronized block là gì?
- **Q:** Hai thread có thể đồng thời thực thi hai synchronized method khác nhau của cùng một object không?
- **Q:** Reentrant locking là gì và tại sao Java hỗ trợ nó?
