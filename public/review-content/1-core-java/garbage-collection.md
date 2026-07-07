# Garbage Collection

**Breadcrumb:** 1. Core Java › JVM Internals

> GC tự động thu hồi bộ nhớ heap của các object không còn được tham chiếu, sử dụng các collector khác nhau (G1, ZGC, Shenandoah) với đánh đổi throughput/latency khác nhau.

## Các điểm chính

- ✦ **G1GC** (mặc định Java 9+): region-based, mục tiêu pause dự đoán được, lựa chọn tốt cho mục đích chung.
- ✦ **ZGC** (Java 15+ production): pause dưới mili-giây, scale đến heap hàng TB.
- ✦ **Shenandoah**: pause cực thấp, dự án open-source của Red Hat.
- ✦ Serial/Parallel GC: đơn giản, tập trung throughput, tốt cho batch job.
- ✦ GC roots: thread stack, static field, JNI reference — object có thể reach từ root là còn sống.
- ✦ Tránh finalizer; dùng <code>Cleaner</code> hoặc <code>try-with-resources</code> để dọn tài nguyên.

*GC algorithm selection + runtime metrics + GC roots + avoiding churn*
```java
// ---- GC Algorithm Decision Tree ----
//
// Throughput first (batch ETL, analytics)?    → ParallelGC
//   -XX:+UseParallelGC
//
// Balanced latency + throughput (REST API)?  → G1GC (default Java 9+)
//   -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:G1HeapRegionSize=16m
//
// Sub-millisecond pauses (payment, trading)? → ZGC (Java 15+ production)
//   -XX:+UseZGC -XX:SoftMaxHeapSize=4g
//
// Red Hat / low-latency alternative?         → Shenandoah
//   -XX:+UseShenandoahGC

// ---- Enable GC logging — mandatory in production ----
// java -Xlog:gc*:file=/var/log/app/gc.log:time,uptime,pid:filecount=5,filesize=20m

// ---- Monitoring GC impact at runtime ----
public static void printGcStats() {
    for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) {
        System.out.printf("GC [%-30s]  count=%4d  totalTimeMs=%6d%n",
            gc.getName(), gc.getCollectionCount(), gc.getCollectionTime());
    }
    // Output (G1GC example):
    // GC [G1 Young Generation         ]  count=  42  totalTimeMs=   380
    // GC [G1 Old Generation           ]  count=   1  totalTimeMs=   210
}

// ---- GC root categories — objects reachable from these are NEVER collected ----
// 1. Active thread stacks (local variables & method parameters)
// 2. Static fields of loaded classes
// 3. JNI global references
// 4. Synchronized monitor references

// ---- Practical: avoid premature promotion (object churn in Old Gen) ----
public class OrderBatchProcessor {
    // BAD: allocates large arrays in a tight loop → Eden overflow → premature promotion
    public void processBad(List<Order> orders) {
        for (Order o : orders) {
            BigDecimal[] prices = new BigDecimal[o.getItems().size()]; // new array per order
            // ... populate, use once, discard — creates GC pressure
        }
    }

    // BETTER: collect via stream — JIT can scalar-replace short-lived intermediates
    public void processBetter(List<Order> orders) {
        orders.forEach(o -> {
            BigDecimal total = o.getItems().stream()
                .map(OrderItem::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            recordTotal(o.getId(), total);
        });
    }
}
```

### 💡 Lời khuyên thực tế

Với microservice có SLA latency nghiêm ngặt, dùng ZGC hoặc Shenandoah. Với batch ETL job, dùng ParallelGC để tối đa throughput. Monitor GC với Prometheus JMX exporter + Grafana dashboard hiển thị pause time và heap usage.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa Minor GC và Full GC là gì?
- **Q:** Khi nào bạn chọn ZGC thay vì G1GC?
- **Q:** Làm thế nào để phân tích và tune GC trong production?
