# Template Method Pattern

**Breadcrumb:** 10. Design Patterns › Behavioral

> Template Method định nghĩa skeleton thuật toán trong base class như final method, để subclass quyết định step biến đổi — giữ cấu trúc cố định trong khi thay đổi hành vi cụ thể.

## Các điểm chính

- ✦ Base class: template method <code>final</code> gọi các abstract step theo thứ tự.
- ✦ Subclass: override abstract step mà không đụng đến cấu trúc thuật toán.
- ✦ Hook method: override point tùy chọn với implementation mặc định (thường no-op).
- ✦ Spring: JdbcTemplate.execute(), AbstractMessageConverter, nhiều Spring Batch step.
- ✦ Vs Strategy: Template Method = inheritance; Strategy = composition. Ưu tiên Strategy cho code mới.

*ReportGenerator abstract: generateReport() calls fetchData()+processData()+render()+deliver()*
```java
// ── Abstract base class: fixed algorithm skeleton ────────────────────────────
@Slf4j
public abstract class ReportGenerator<T> {

    // Template method — FINAL: subclasses cannot change algorithm order
    public final ReportResult generate(ReportRequest request) {
        log.info("Report generation start type={}", getReportType());

        // Step 1: validate input (hook — override for custom validation)
        validateRequest(request);

        // Step 2: fetch data (abstract — each report knows where to get data)
        List<T> rawData = fetchData(request);
        log.info("Fetched {} records", rawData.size());

        // Step 3: process/aggregate (abstract — business logic varies by report)
        List<T> processedData = processData(rawData, request);

        // Step 4: hook — optional post-processing (default: no-op)
        afterProcessing(processedData, request);

        // Step 5: format/render output (abstract — PDF vs Excel vs CSV)
        byte[] output = render(processedData, request);

        // Step 6: deliver output (hook — override to upload to S3, email, etc.)
        String location = deliver(output, request);

        return new ReportResult(getReportType(), location, rawData.size());
    }

    protected abstract String     getReportType();
    protected abstract List<T>    fetchData(ReportRequest request);
    protected abstract List<T>    processData(List<T> data, ReportRequest request);
    protected abstract byte[]     render(List<T> data, ReportRequest request);

    // Hooks — optional override points with default implementations
    protected void   validateRequest(ReportRequest req) {}  // default: pass
    protected void   afterProcessing(List<T> data, ReportRequest req) {}  // default: no-op
    protected String deliver(byte[] output, ReportRequest req) {
        return "inline";  // default: return directly (not uploaded)
    }
}

// ── Concrete 1: Sales Report — DB → aggregate → PDF → S3 ────────────────────
@Component
public class SalesReportGenerator extends ReportGenerator<SalesRecord> {
    private final OrderRepository  orderRepo;
    private final PdfExporter      pdfExporter;
    private final S3Uploader       s3;

    @Override protected String getReportType() { return "SALES"; }

    @Override
    protected void validateRequest(ReportRequest req) {
        if (req.getFrom().isAfter(req.getTo()))
            throw new IllegalArgumentException("from must be before to");
    }

    @Override
    protected List<SalesRecord> fetchData(ReportRequest req) {
        return orderRepo.findSalesByPeriod(req.getFrom(), req.getTo());
    }

    @Override
    protected List<SalesRecord> processData(List<SalesRecord> raw, ReportRequest req) {
        // Aggregate by product category, compute totals
        return raw.stream()
            .collect(groupingBy(SalesRecord::getCategory, summingLong(SalesRecord::getRevenue)))
            .entrySet().stream()
            .map(e -> new SalesRecord(e.getKey(), e.getValue()))
            .sorted(Comparator.comparingLong(SalesRecord::getRevenue).reversed())
            .toList();
    }

    @Override
    protected byte[] render(List<SalesRecord> data, ReportRequest req) {
        return pdfExporter.exportTable(data, List.of("Category", "Revenue"));
    }

    @Override
    protected String deliver(byte[] pdf, ReportRequest req) {
        String key = "reports/sales/" + req.getFrom() + "-" + req.getTo() + ".pdf";
        return s3.upload(key, pdf);   // returns S3 URL
    }
}

// ── Concrete 2: Inventory Report — shares structure, different steps ───────────
@Component
public class InventoryReportGenerator extends ReportGenerator<InventoryItem> {
    @Override protected String getReportType() { return "INVENTORY"; }
    @Override protected List<InventoryItem> fetchData(ReportRequest req) {
        return productRepo.findLowStockItems(req.getThreshold());
    }
    @Override protected List<InventoryItem> processData(List<InventoryItem> raw, ReportRequest req) {
        return raw.stream().sorted(Comparator.comparingInt(InventoryItem::getStock)).toList();
    }
    @Override protected byte[] render(List<InventoryItem> data, ReportRequest req) {
        return csvExporter.export(data);   // CSV instead of PDF
    }
    // deliver() not overridden → uses default (inline) — no S3 upload needed
}
```

### 💡 Lời khuyên thực tế

Dùng Template Method cho thuật toán cấu trúc cố định với step biến đổi: ETL pipeline, document generation, import/export flow. Khi cần thay đổi thuật toán (không chỉ step), dùng Strategy thay thế.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa Template Method và Strategy?
- **Q:** Hook method trong Template Method là gì?
- **Q:** Khi nào chọn Template Method thay vì Strategy?
