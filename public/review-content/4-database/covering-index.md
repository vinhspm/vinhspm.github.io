# Covering Index

**Breadcrumb:** 4. Database › Indexing

> Covering index chứa tất cả cột cần thiết cho query, cho phép DB trả lời hoàn toàn từ index mà không cần truy cập table heap — tối đa hóa hiệu năng đọc.

## Các điểm chính

- ✦ Index "covers" một query khi cột SELECT, WHERE và ORDER BY đều nằm trong index.
- ✦ Loại bỏ "heap fetch" (random I/O đến table page) — đặc biệt có tác động cho bảng lớn.
- ✦ PostgreSQL: mệnh đề <code>INCLUDE</code> thêm cột không phải key vào index leaf page.
- ✦ Trade-off: covering index lớn hơn — chỉ bao gồm cột được đọc thường xuyên.
- ✦ Output EXPLAIN hiển thị "Index Only Scan" cho covering index (không truy cập heap).

*Covering index với INCLUDE: từ Index Scan (heap fetch) sang Index Only Scan (0 heap fetch)*
```java
-- ✅ Target query for covering index: order list API endpoint (called thousands/sec)
-- Columns needed: WHERE customer_id, SELECT id + status + total + created_at
SELECT id, status, total, created_at
FROM orders
WHERE customer_id = 42
  AND status IN ('PENDING', 'PROCESSING')
ORDER BY created_at DESC
LIMIT 20;

-- ❌ Without covering index: two-phase lookup
-- Phase 1: B-Tree index scan on customer_id → get row pointers
-- Phase 2: heap fetch for EACH matching row to read status, total, created_at
--          (random I/O — expensive on spinning disk or large tables)

-- ✅ Covering index: key columns in index, extra payload in INCLUDE
-- INCLUDE columns are stored in leaf pages but NOT in internal B-Tree pages
-- → index is smaller (INCLUDE columns not used for tree navigation)
CREATE INDEX idx_orders_customer_covering
    ON orders(customer_id, status, created_at DESC)   -- key cols: used for lookup + sort
    INCLUDE (id, total);                               -- payload cols: read from leaf, no heap fetch

-- Now the query uses Index Only Scan — no heap access at all:
-- EXPLAIN output:
-- Index Only Scan using idx_orders_customer_covering on orders
--   Index Cond: ((customer_id = 42) AND (status = ANY ('{PENDING,PROCESSING}'::text[])))
--   Heap Fetches: 0          ← key metric: 0 means full covering
--   Buffers: shared hit=4    ← 4 index pages read; no table pages
-- Rows Removed by Filter: 0

-- ✅ Verify covering effectiveness:
-- pg_stat_user_indexes tracks idx_tup_read vs idx_tup_fetch
-- idx_tup_fetch = 0 means Index Only Scan is working (no heap fetch)
SELECT indexrelname, idx_tup_read, idx_tup_fetch,
       ROUND(100.0 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 1) AS heap_fetch_pct
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_orders_customer_covering';
```

### 💡 Lời khuyên thực tế

Với hot read path (ví dụ: API endpoint được query hàng nghìn lần/giây), thiết kế covering index cụ thể cho những query đó. Monitor heap fetch ratio qua `pg_stat_user_indexes.idx_tup_fetch` vs `idx_tup_read`.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Covering index là gì và cải thiện hiệu năng thế nào?</b></summary>

Là index chứa toàn bộ các cột cần truy vấn. Nó tăng hiệu năng vượt trội vì DB chỉ cần đọc dữ liệu trực tiếp từ cây index (Index Only Scan) mà không cần tốn chi phí đọc ngẫu nhiên vào đĩa để lấy dữ liệu từ bảng gốc (Table Lookup/Key Lookup).
</details>

<details>
<summary><b>Q: "Index Only Scan" trong output EXPLAIN có nghĩa gì?</b></summary>

Có nghĩa là DB engine đã tìm thấy toàn bộ dữ liệu cần thiết từ chính index và hoàn toàn không cần phải truy cập vào các trang dữ liệu của bảng (data heap/data pages).
</details>

<details>
<summary><b>Q: Khi nào covering index KHÔNG có lợi?</b></summary>

Khi bảng bị cập nhật/ghi quá thường xuyên (vì phải cập nhật thêm nhiều cột trong index làm chậm lệnh WRITE), hoặc khi danh sách các cột cần SELECT quá lớn/nhiều làm tăng kích thước của cây index quá mức, gây tốn bộ nhớ RAM.
</details>
