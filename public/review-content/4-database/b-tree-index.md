# B-Tree Index

**Breadcrumb:** 4. Database › Indexing

> B-Tree (balanced tree) là cấu trúc index mặc định trong hầu hết DB, hỗ trợ equality và range query với O(log n) lookup bằng cách giữ key đã sắp xếp trên các page cân bằng.

## Các điểm chính

- ✦ Tất cả leaf node ở cùng độ sâu (cân bằng). Internal node là routing node.
- ✦ Hỗ trợ: <code>=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>BETWEEN</code>, <code>LIKE 'prefix%'</code> (wildcard đầu phá vỡ nó).
- ✦ Thứ tự sắp xếp cho phép ORDER BY và range scan hiệu quả.
- ✦ Index page 8KB (Postgres) — hàng nghìn entry mỗi page, thường 3-4 cấp sâu cho hàng triệu hàng.
- ✦ PostgreSQL còn có: Hash (chỉ equality), GiST (geo/full-text), GIN (array/JSONB), BRIN (dữ liệu tuần tự).

*B-Tree (range, prefix LIKE) + GIN/pg_trgm (fuzzy search) + BRIN (time-series) + Hash*
```java
-- ✅ B-Tree index: supports equality AND range — default for most use cases
CREATE INDEX idx_products_price ON products(price);
-- All of these CAN use the B-Tree index:
SELECT * FROM products WHERE price = 299;                         -- equality
SELECT * FROM products WHERE price BETWEEN 100 AND 500;          -- range
SELECT * FROM products WHERE price > 1000 ORDER BY price ASC;    -- range + sort (same direction)
SELECT * FROM products WHERE name LIKE 'iPhone%';                -- prefix match (anchor left)

-- ❌ B-Tree CANNOT help with leading wildcard LIKE or regex:
SELECT * FROM products WHERE name LIKE '%phone%';    -- full table scan — B-Tree has no entry point
SELECT * FROM products WHERE name ILIKE '%Phone%';   -- case-insensitive also breaks B-Tree

-- ✅ Fix for full-text / fuzzy search: GIN index with pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Trigram index: breaks 'iPhone' into ('iPh','Pho','hon','one') and indexes each
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
-- Now both of these use the GIN index:
SELECT * FROM products WHERE name LIKE '%phone%';    -- uses GIN trigram scan
SELECT * FROM products WHERE name ILIKE '%Phone%';   -- also works (case-insensitive)

-- ✅ BRIN index: for append-only time-series tables (orders, events, logs)
-- Much smaller than B-Tree; works because physically adjacent rows have similar timestamps
CREATE INDEX idx_orders_created_brin ON orders USING BRIN (created_at);
-- Effective for: SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-02-01'
-- Not effective for: random-access by customer_id (use B-Tree there)

-- ✅ Hash index: equality-only, faster than B-Tree for pure =
CREATE INDEX idx_users_email_hash ON users USING HASH (email);
SELECT * FROM users WHERE email = 'alice@example.com';    -- uses hash index (O(1) lookup)
```

### 💡 Lời khuyên thực tế

Dùng B-Tree cho hầu hết trường hợp. Chuyển sang GIN/GiST cho full-text search, JSONB query hoặc array containment. BRIN xuất sắc cho bảng time-series append-only (kích thước nhỏ, nhanh cho sequential range).

### ❓ Câu hỏi phỏng vấn

- **Q:** B-Tree index KHÔNG thể tối ưu loại query nào?
- **Q:** Tại sao B-Tree index không hỗ trợ LIKE '%word%'?
- **Q:** Một B-Tree index điển hình sâu bao nhiêu cấp cho 10 triệu hàng?
