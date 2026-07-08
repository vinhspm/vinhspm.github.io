# Vấn Đề N+1 Query

**Breadcrumb:** 4. Database › JPA / Hibernate

> N+1 xảy ra khi fetch N entity cha trigger N query bổ sung (một mỗi entity) để tải lazy association — tránh được với JOIN FETCH hoặc batch fetching.

## Các điểm chính

- ✦ Ví dụ: fetch 100 order, sau đó truy cập <code>order.getCustomer()</code> → 100 SELECT query bổ sung.
- ✦ Tổng cộng: 1 (order) + N (customer) = N+1 query.
- ✦ Phát hiện: <code>spring.jpa.show-sql=true</code> + Hibernate statistics, hoặc thư viện <code>datasource-proxy</code>.
- ✦ Sửa 1: <code>JOIN FETCH</code> trong JPQL.
- ✦ Sửa 2: <code>@BatchSize(size=30)</code> trên association — tải 30 mỗi lần.
- ✦ Sửa 3: Dùng DTO projection và một join query duy nhất.

*N+1: problem illustration + 4 fixes: JOIN FETCH, @EntityGraph, @BatchSize, DTO Projection*
```java
// ❌ N+1 Problem: 1 query to load orders + N queries for each order's items
List<Order> orders = orderRepository.findAll();  // 1 query: SELECT * FROM orders
for (Order order : orders) {
    // Each access fires a new SELECT — N queries!
    order.getItems().size();     // LAZY fetch triggered: SELECT * FROM order_items WHERE order_id=?
    // For 100 orders → 100 extra queries → 101 queries total!
}

// ✅ Fix 1: JOIN FETCH in JPQL — single query loads orders + items together
@Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.status = :status")
List<Order> findWithItemsByStatus(@Param("status") OrderStatus status);
// SQL: SELECT o.*, oi.* FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
//      WHERE o.status = ?
// → 1 query instead of N+1; DISTINCT prevents duplicate Order objects from join

// ✅ Fix 2: @EntityGraph — declarative version of JOIN FETCH, cleaner for complex graphs
@EntityGraph(attributePaths = {"items", "items.product"})
List<Order> findByCustomerId(Long customerId);
// Loads: order + order_items + product for each item — all in 1 query
// Best when: multiple associations needed; avoids writing JPQL

// ✅ Fix 3: Batch fetch size — replaces N individual queries with ceil(N/50) IN queries
// In application.yml:
// spring.jpa.properties.hibernate.default_batch_fetch_size=50
// Or per-association:
@OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
@BatchSize(size = 50)  // instead of N queries: SELECT * FROM order_items WHERE order_id IN (?, ?, ..., ?)
private List<OrderItem> items;
// For 100 orders: 2 IN queries instead of 100 individual queries

// ✅ Fix 4: DTO Projection — skip entity loading entirely, query only needed columns
@Query("SELECT new com.example.dto.OrderSummary(o.id, o.total, o.status, SIZE(o.items)) " +
       "FROM Order o WHERE o.customer.id = :customerId")
List<OrderSummary> findOrderSummaries(@Param("customerId") Long customerId);
// Single optimized query; no entity graph loaded; no lazy proxies

// ✅ Detecting N+1 in tests with datasource-proxy
// @ExtendWith(MockitoExtension.class)
// @QuickPerfTest
// @ExpectSelect(1)  // fails test if more than 1 SELECT is issued
// public void testFindOrders() { ... }
```

### 💡 Lời khuyên thực tế

Bật Hibernate statistics trong dev (`spring.jpa.properties.hibernate.generate_statistics=true`) và fail-fast nếu số query vượt ngưỡng. Dùng `datasource-proxy` + `QuickPerfExtension` trong test để bắt N+1 trước khi đến production.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: N+1 query problem là gì và tại sao xảy ra?</b></summary>

Là vấn đề hiệu năng xảy ra khi ứng dụng thực hiện 1 câu query để lấy danh sách cha (1), sau đó với mỗi bản ghi cha lại thực hiện thêm 1 câu query nữa để lấy danh sách con liên quan (N), tổng cộng tạo ra N+1 truy vấn xuống DB. Nó xảy ra do các thuộc tính liên kết được cấu hình Lazy Loading và được duyệt qua trong vòng lặp ở tầng ứng dụng.
</details>

<details>
<summary><b>Q: @BatchSize giúp gì với N+1?</b></summary>

`@BatchSize` cấu hình cho Hibernate tải trước dữ liệu con cho nhiều thực thể cha cùng một lúc bằng câu lệnh `IN` (ví dụ `WHERE parent_id IN (?, ?, ?, ?)` với kích thước batch định trước), giúp giảm số lượng truy vấn từ N+1 xuống còn `1 + (N/batch_size)`.
</details>

<details>
<summary><b>Q: Làm thế nào để phát hiện N+1 query trong Spring Boot app?</b></summary>

Bật cấu hình log sql `spring.jpa.show-sql=true`, sử dụng các thư viện như `QuickPerf` trong unit test, hoặc sử dụng các công cụ giám sát hiệu năng APM (như Datadog, Dynatrace) để phát hiện các truy vấn lặp đi lặp lại có cùng cấu trúc.
</details>
