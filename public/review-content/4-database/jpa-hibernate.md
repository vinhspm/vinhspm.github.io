# JPA / Hibernate

**Breadcrumb:** 4. Database

> JPA là đặc tả Java persistence API; Hibernate là implementation phổ biến nhất — map Java object sang relational table với các tính năng ORM như lazy loading, caching và lifecycle management.

## Các điểm chính

- ✦ <code>@Entity</code>, <code>@Table</code>, <code>@Id</code>, <code>@Column</code>, <code>@GeneratedValue</code>.
- ✦ Relationship: <code>@OneToMany</code>, <code>@ManyToOne</code>, <code>@ManyToMany</code>, <code>@OneToOne</code>.
- ✦ JPQL: ngôn ngữ query hướng đối tượng. Native SQL cho query phức tạp.
- ✦ First-level cache (Session): trong transaction, cùng ID trả về cùng object. Second-level cache: qua nhiều session (Ehcache, Redis).
- ✦ Dirty checking: Hibernate theo dõi thay đổi state của managed entity và tự tạo UPDATE khi flush.

*JPA entity: @ManyToOne LAZY, @OneToMany cascade+orphanRemoval, @Version, @CreatedDate + Repository với JOIN FETCH và native query*
```java
// ✅ JPA Entity: Order with all common annotations
@Entity
@Table(name = "orders",
       indexes = { @Index(name = "idx_orders_customer", columnList = "customer_id"),
                   @Index(name = "idx_orders_status",   columnList = "status, created_at") })
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // LAZY: don't load User unless explicitly accessed — avoids unexpected query
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Enumerated(EnumType.STRING)  // store "PENDING" not "0" — survives enum reordering
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total", precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    // Cascade: save/delete Order also saves/deletes its items
    // orphanRemoval: removing item from list triggers DELETE (not just detach)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    @Version                      // optimistic locking: prevents lost updates
    private Long version;

    @CreatedDate                  // Spring Data: auto-set on persist
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate             // Spring Data: auto-set on every update
    private LocalDateTime updatedAt;
}

// ✅ Repository with custom JPQL queries
public interface OrderRepository extends JpaRepository<Order, Long> {

    // JOIN FETCH: load order + items in ONE query (prevents N+1)
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    // Derived query: Spring generates SQL from method name
    List<Order> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, OrderStatus status);

    // Native SQL: complex aggregation not expressible in JPQL
    @Query(value = "SELECT DATE_TRUNC('month', created_at), SUM(total), COUNT(*) " +
                   "FROM orders WHERE customer_id = :cid GROUP BY 1 ORDER BY 1",
           nativeQuery = true)
    List<Object[]> getMonthlyStatsByCustomer(@Param("cid") Long customerId);
}
```

### 💡 Lời khuyên thực tế

Luôn định nghĩa `FetchType.LAZY` trên collection và association `@ManyToOne`. Chỉ tải eager khi cần qua JOIN FETCH trong query cụ thể. Bật `spring.jpa.show-sql=true` trong dev để bắt query bất ngờ.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa EAGER và LAZY fetching là gì?</b></summary>

`EAGER` tải dữ liệu liên quan ngay lập tức cùng lúc với entity chính. `LAZY` trì hoãn việc tải dữ liệu liên quan cho đến khi thuộc tính đó được truy cập lần đầu tiên (thông qua Proxy object).
</details>

<details>
<summary><b>Q: Dirty checking trong Hibernate là gì?</b></summary>

Là cơ chế tự động phát hiện các thay đổi trên trạng thái của các Managed entity trong Persistence Context. Khi transaction chuẩn bị commit, Hibernate so sánh thực thể hiện tại với bản snapshot ban đầu và tự động sinh ra các câu lệnh `UPDATE` SQL cần thiết xuống DB mà không cần gọi hàm update thủ công.
</details>

<details>
<summary><b>Q: JPA first-level cache hoạt động thế nào?</b></summary>

Là bộ đệm cấp 1 gắn liền với Session (EntityManager). Mọi thao tác tìm kiếm thực thể bằng ID trong cùng một Session trước hết sẽ kiểm tra xem thực thể đó đã có trong cache chưa. Nếu có, nó trả về ngay lập tức mà không cần truy vấn lại database. Cache này tự giải phóng khi Session đóng.
</details>
