# GROUP BY / HAVING

**Breadcrumb:** 4. Database › SQL

> GROUP BY gộp hàng thành nhóm để aggregate; HAVING lọc nhóm sau aggregate — tương tự WHERE nhưng cho kết quả aggregated.

## Các điểm chính

- ✦ Cột SELECT phải nằm trong GROUP BY hoặc được bọc trong aggregate (<code>SUM</code>, <code>COUNT</code>, <code>MAX</code>).
- ✦ Thứ tự thực thi: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
- ✦ HAVING vs WHERE: WHERE lọc hàng riêng lẻ *trước* khi nhóm; HAVING lọc nhóm *sau*.
- ✦ <code>GROUP BY ROLLUP</code>: thêm subtotal. <code>GROUPING SETS</code>: nhiều tổ hợp nhóm.

*GROUP BY + HAVING cho VIP customers + ROLLUP cho multi-level sales report*
```java
-- ✅ Basic GROUP BY + HAVING: VIP customers (5+ completed orders, spent > $500)
-- Execution order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
SELECT
    u.id           AS customer_id,
    u.email,
    COUNT(o.id)    AS order_count,
    SUM(o.total)   AS total_spent,
    AVG(o.total)   AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
JOIN orders o ON o.customer_id = u.id
WHERE o.status = 'COMPLETED'           -- ✅ WHERE filters individual rows BEFORE grouping
  AND o.created_at >= '2024-01-01'     --    (cheaper: reduces rows that enter GROUP BY)
GROUP BY u.id, u.email
HAVING COUNT(o.id) >= 5               -- ✅ HAVING filters groups AFTER aggregation
   AND SUM(o.total) > 500             --    (can reference aggregate functions here)
ORDER BY total_spent DESC
LIMIT 100;

-- ✅ ROLLUP: sales report with subtotals per category and grand total
-- NULL in the result = the subtotal/grand-total row for that dimension
SELECT
    p.category,
    DATE_TRUNC('month', o.created_at) AS month,
    SUM(oi.quantity * oi.unit_price)  AS revenue,
    COUNT(DISTINCT o.id)              AS order_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
WHERE o.status = 'COMPLETED'
  AND o.created_at >= NOW() - INTERVAL '6 months'
GROUP BY ROLLUP(p.category, DATE_TRUNC('month', o.created_at))
-- Result rows include:
--   (Electronics, 2024-01) → specific month subtotal
--   (Electronics, NULL)    → Electronics total across all months
--   (NULL, NULL)           → grand total across all categories
ORDER BY p.category NULLS LAST, month NULLS LAST;
```

### 💡 Lời khuyên thực tế

Luôn đặt điều kiện trên cột không aggregate vào WHERE (không phải HAVING) để hiệu năng — DB có thể lọc hàng trước khi nhóm, giảm công việc. Chỉ dùng HAVING cho điều kiện trên kết quả aggregate.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa WHERE và HAVING là gì?</b></summary>

`WHERE` lọc dữ liệu trước khi gộp nhóm (`GROUP BY`). `HAVING` lọc kết quả sau khi đã gộp nhóm trên các hàm aggregate.
</details>

<details>
<summary><b>Q: Bạn có thể dùng HAVING mà không có GROUP BY không?</b></summary>

Được. Khi đó, toàn bộ bảng được coi là một nhóm duy nhất. Tuy nhiên, nó chỉ có ý nghĩa khi truy vấn các hàm tổng hợp (ví dụ: `SELECT AVG(price) FROM products HAVING AVG(price) > 100`).
</details>

<details>
<summary><b>Q: Thứ tự thực thi SQL là gì?</b></summary>

`FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT/OFFSET`.
</details>
