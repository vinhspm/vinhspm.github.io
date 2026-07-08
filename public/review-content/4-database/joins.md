# SQL Joins

**Breadcrumb:** 4. Database › SQL

> JOIN kết hợp hàng từ nhiều bảng dựa trên cột liên quan — hiểu từng loại là quan trọng để viết query đúng.

## Các điểm chính

- ✦ **INNER JOIN**: chỉ trả về hàng nơi điều kiện join khớp ở cả hai bảng.
- ✦ **LEFT JOIN**: tất cả hàng từ bảng trái; NULL cho hàng bên phải không khớp.
- ✦ **RIGHT JOIN**: tất cả hàng từ bảng phải; NULL cho hàng bên trái không khớp.
- ✦ **FULL OUTER JOIN**: tất cả hàng từ cả hai; NULL nơi không khớp.
- ✦ **CROSS JOIN**: tích Descartes — mỗi hàng × mỗi hàng.
- ✦ **SELF JOIN**: join bảng với chính nó (ví dụ: nhân viên → quản lý).

*INNER JOIN, LEFT JOIN (with aggregation), anti-join pattern, FULL OUTER JOIN*
```sql
-- ✅ INNER JOIN: only orders that have items (both sides must match)
SELECT o.id AS order_id, o.total, oi.quantity, p.name AS product_name
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p     ON p.id = oi.product_id
WHERE o.status = 'COMPLETED'
ORDER BY o.created_at DESC;

-- ✅ LEFT JOIN: all users, even those with no orders yet
SELECT u.id, u.email,
       COUNT(o.id)  AS order_count,   -- 0 when no orders (NULL → 0 via COUNT)
       SUM(o.total) AS total_spent     -- NULL when no orders
FROM users u
LEFT JOIN orders o ON o.customer_id = u.id
GROUP BY u.id, u.email
ORDER BY total_spent DESC NULLS LAST;

-- ✅ Anti-join pattern: users who have NEVER placed an order
-- LEFT JOIN + NULL check is more portable than NOT EXISTS in some DBs
SELECT u.id, u.email, u.created_at
FROM users u
LEFT JOIN orders o ON o.customer_id = u.id
WHERE o.id IS NULL                     -- no matching order row → user never ordered
  AND u.created_at < NOW() - INTERVAL '30 days';  -- signed up 30+ days ago

-- ✅ FULL OUTER JOIN: all products and all order_items, including orphans on either side
-- Use case: data quality check — find products never ordered AND order_items with no product
SELECT p.id AS product_id, p.name, oi.order_id
FROM products p
FULL OUTER JOIN order_items oi ON oi.product_id = p.id
WHERE p.id IS NULL           -- orphaned order_item (product deleted)
   OR oi.product_id IS NULL; -- product that was never ordered
```

### 💡 Lời khuyên thực tế

LEFT JOIN với NULL check là pattern phổ biến "tìm bản ghi không có bản ghi liên quan". Cẩn thận với nhiều LEFT JOIN — thất bại khớp ở một join có thể lan truyền NULL qua các join tiếp theo.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa LEFT JOIN và INNER JOIN là gì?</b></summary>

`INNER JOIN` chỉ trả về các hàng khi có sự khớp dữ liệu giữa cả hai bảng. `LEFT JOIN` trả về tất cả các hàng từ bảng bên trái (bảng chính) và các hàng khớp từ bảng bên phải; nếu bảng bên phải không có hàng khớp, các cột tương ứng sẽ nhận giá trị `NULL`.
</details>

<details>
<summary><b>Q: Làm thế nào để tìm hàng trong Bảng A không có khớp trong Bảng B?</b></summary>

Thực hiện `LEFT JOIN` từ Bảng A sang Bảng B với điều kiện khớp, sau đó thêm mệnh đề lọc `WHERE B.key IS NULL`.
</details>

<details>
<summary><b>Q: Tích Descartes là gì và khi nào có thể vô tình xảy ra?</b></summary>

Tích Descartes (Cartesian Product) là kết quả kết hợp mọi hàng của bảng A với mọi hàng của bảng B (số dòng trả về = dòng A * dòng B). Nó vô tình xảy ra khi viết lệnh `JOIN` nhưng quên không khai báo điều kiện khớp (mệnh đề `ON` hoặc `WHERE`).
</details>
