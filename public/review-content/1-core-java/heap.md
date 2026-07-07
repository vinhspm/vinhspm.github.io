# JVM Heap

**Breadcrumb:** 1. Core Java › JVM Internals

> Heap là vùng dữ liệu runtime nơi tất cả các object instance và array tồn tại, được chia thành Young và Old generation để tối ưu garbage collection.

## Các điểm chính

- ✦ **Young Generation**: Eden + Survivor spaces (S0/S1). Hầu hết object chết sớm (giả thuyết thế hệ).
- ✦ **Old Generation (Tenured)**: các object sống lâu được promote từ Young Gen.
- ✦ Minor GC: dọn Young Gen (nhanh, thường xuyên). Major/Full GC: dọn Old Gen (chậm, tốn kém).
- ✦ Cấp phát object nhanh: bump-pointer allocation trong Eden gần như không tốn chi phí.
- ✦ <code>OutOfMemoryError: Java heap space</code> — heap cạn kiệt; tăng <code>-Xmx</code> hoặc sửa memory leak.
- ✦ Dùng <code>jmap -heap</code> hoặc VisualVM để kiểm tra heap usage trực tiếp.

*Heap generations + runtime monitoring + container sizing*
```java
import java.lang.management.*;
import java.util.*;

// ---- Young Gen vs Old Gen lifecycle demo ----
public class HeapDemo {

    // Short-lived objects → allocated in Eden → collected by Minor GC
    public static Order processRequest(String customerId) {
        // These temp objects die before the next Minor GC sweep
        List<String> tempTags = new ArrayList<>();
        tempTags.add("web");
        tempTags.add("v2");

        // The returned Order may survive into Old Gen if held long enough
        return new Order(UUID.randomUUID().toString(), customerId);
    }

    // Long-lived cache → tenured to Old Gen after several Minor GCs
    private static final Map<String, Product> PRODUCT_CACHE = new HashMap<>();

    public static void warmCache(List<Product> products) {
        products.forEach(p -> PRODUCT_CACHE.put(p.getId(), p)); // these objects get promoted
    }
}

// ---- Monitoring heap at runtime ----
public static void printHeapStats() {
    MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
    MemoryUsage heap = memBean.getHeapMemoryUsage();
    System.out.printf("Heap  — init: %dM  used: %dM  committed: %dM  max: %dM%n",
        toMB(heap.getInit()), toMB(heap.getUsed()),
        toMB(heap.getCommitted()), toMB(heap.getMax()));

    // Per-generation stats (Young / Old / Survivor)
    for (MemoryPoolMXBean pool : ManagementFactory.getMemoryPoolMXBeans()) {
        if (pool.getType() == MemoryType.HEAP) {
            MemoryUsage u = pool.getUsage();
            System.out.printf("  Pool %-25s used=%dM max=%dM%n",
                pool.getName(), toMB(u.getUsed()), toMB(u.getMax()));
        }
    }
}
private static long toMB(long bytes) { return bytes / 1_048_576; }

// ---- Docker / K8s sizing example ----
// Container limit: 1 GB
// -XX:+UseContainerSupport            (default Java 11+)
// -XX:MaxRAMPercentage=75.0           → JVM heap max = 768 MB
// Leave 25% for: OS, Metaspace, code cache, thread stacks, off-heap NIO buffers
```

### 💡 Lời khuyên thực tế

Trong môi trường container, đặt `-XX:+UseContainerSupport` (mặc định Java 11+) để JVM đọc giới hạn bộ nhớ cgroup thay vì bộ nhớ host. Đặt `-XX:MaxRAMPercentage=75` để giới hạn heap ở 75% bộ nhớ container.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa Young và Old generation là gì?
- **Q:** Nguyên nhân nào gây ra OutOfMemoryError: Java heap space?
- **Q:** Làm thế nào để tune heap size cho Spring Boot app trong container?
