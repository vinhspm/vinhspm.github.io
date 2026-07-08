# MyBatis vs JPA/Hibernate

**Breadcrumb:** 4. Database › MyBatis

> MyBatis và JPA đại diện cho hai triết lý ORM đối lập: MyBatis SQL-first (tường minh, kiểm soát được); JPA object-first (tiện lợi CRUD, SQL tự generate). Chọn dựa trên độ phức tạp query và kỹ năng team.

## Các điểm chính

- ✦ **MyBatis**: bạn viết SQL. Toàn quyền kiểm soát, execution plan dự đoán được, tốt cho query phức tạp và reporting.
- ✦ **JPA/Hibernate**: SQL tự generate từ entity model. CRUD nhanh, quản lý entity lifecycle, khó tối ưu query phức tạp.
- ✦ Thế mạnh MyBatis: JOIN phức tạp, stored procedure, batch operation, phối hợp với DBA, đường dẫn performance-critical.
- ✦ Thế mạnh JPA: CRUD entity đơn giản, audit field (@CreatedDate), phân trang, portability giữa các DB.
- ✦ **N+1 risk**: JPA lazy loading gây N+1 nếu quên @EntityGraph hoặc JOIN FETCH. MyBatis tường minh tất cả loading — không query ẩn.
- ✦ **Hybrid**: Spring Data JPA cho repo đơn giản + MyBatis mapper cho reporting phức tạp — hoạt động trong cùng project.

*So sánh N+1 và approach hybrid*
```java
// JPA: CRUD tiện nhưng có N+1 risk
@Entity public class Order {
    @OneToMany(fetch = FetchType.LAZY) // N+1 nếu access ngoài transaction!
    List<OrderItem> items;
}
// Fix: join fetch trong JPQL
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
Order findWithItems(@Param("id") Long id);

// MyBatis: JOIN tường minh, không N+1 bất ngờ
// (xem ví dụ ResultMap ở trên — query một lần trả về Order + items)

// Hybrid trong cùng Spring Boot project:
@Repository
public interface OrderRepo extends JpaRepository<Order, Long> {}  // CRUD đơn giản

@Mapper
public interface OrderReportMapper {
    List<MonthlySalesRow> monthlySalesByProduct(@Param("year") int year); // report phức tạp
}

// Config MyBatis (application.yml):
// mybatis:
//   configuration:
//     map-underscore-to-camel-case: true
//   mapper-locations: classpath:mapper/**/*.xml
```

### 💡 Lời khuyên thực tế

Khi hỏi "MyBatis vs JPA": nêu cả hai trade-off, rồi đưa ra recommendation có lý do. JPA cho service user CRUD đơn giản. MyBatis cho module báo cáo tài chính với JOIN 20 bảng. Approach hybrid (JPA + MyBatis trong cùng project) phổ biến trong enterprise — Spring Boot hỗ trợ cả hai cùng lúc.

### ❓ Câu hỏi phỏng vấn

- **Q:** N+1 query trong JPA do đâu và fix thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Xảy ra do cơ chế LAZY fetching: tải entity cha, sau đó duyệt qua danh sách liên kết con và tạo ra thêm N câu query để lấy dữ liệu con. Fix bằng cách dùng `JOIN FETCH` trong JPQL/HQL, cấu hình `@EntityGraph`, hoặc sử dụng `@BatchSize` để gộp các truy vấn con.
  </details>
- **Q:** Dùng cả MyBatis và Spring Data JPA trong cùng Spring Boot project được không?
  <details>
  <summary><b>Trả lời:</b></summary>

  Được. Cả hai có thể chia sẻ chung một DataSource và cùng tham gia vào một Transaction quản lý bởi Spring (`@Transactional`), giúp tận dụng điểm mạnh của cả hai công cụ.
  </details>
- **Q:** Khi nào recommend MyBatis cho project mới?
  <details>
  <summary><b>Trả lời:</b></summary>

  Khi hệ thống có các câu truy vấn SQL cực kỳ phức tạp cần tối ưu hóa thủ công tỉ mỉ, hoặc khi làm việc với các cơ sở dữ liệu có sẵn không được thiết kế theo chuẩn ORM, hoặc đội ngũ phát triển thành thạo viết SQL thuần túy hơn là học JPA/Hibernate.
  </details>
