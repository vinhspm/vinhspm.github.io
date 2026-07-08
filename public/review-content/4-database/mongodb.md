# MongoDB

**Breadcrumb:** 4. Database › NoSQL

> MongoDB là document database lưu BSON (binary JSON) document, cho phép schema linh hoạt, embedded document và horizontal sharding cho khối lượng ghi cao.

## Các điểm chính

- ✦ Collection (≈ bảng), Document (≈ hàng), Field (≈ cột) — nhưng schema linh hoạt.
- ✦ Embedded document vs reference: embed cho dữ liệu query cùng nhau; reference cho sub-document lớn hoặc chia sẻ.
- ✦ Indexing: cùng nền tảng B-tree; hỗ trợ compound, text, geospatial, TTL index.
- ✦ Aggregation pipeline: <code>$match</code>, <code>$group</code>, <code>$sort</code>, <code>$lookup</code> (join), <code>$project</code>.
- ✦ ACID transaction (v4.0+): multi-document, multi-collection transaction có sẵn.

*MongoDB: @Document với embedded Review, Repository queries, Aggregation pipeline (group/unwind/lookup)*
```java
// ✅ MongoDB Document: product catalog with flexible schema per category
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private String category;
    private double price;
    private Map<String, Object> specs;         // flexible: different fields per category
    private List<String> tags;
    private List<Review> reviews;              // embedded: always queried with product

    // Nested class — embedded in same document (no JOIN needed)
    public static class Review {
        private String userId;
        private int rating;
        private String text;
        private LocalDateTime date;
    }
}

// ✅ Spring Data MongoDB Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    // Query by field (Spring generates the MongoDB query)
    List<Product> findByCategoryAndPriceBetween(String category, double minPrice, double maxPrice);

    // Full-text search (requires text index: db.products.createIndex({name:"text",tags:"text"}))
    @TextIndexed
    List<Product> findByNameContaining(String keyword);
}

// ✅ MongoDB Aggregation Pipeline: revenue report by product category
@Repository
public class OrderReportRepository {
    @Autowired
    private MongoTemplate mongo;

    public List<CategoryRevenue> getRevenueByCategory(int topN) {
        Aggregation pipeline = Aggregation.newAggregation(
            // Stage 1: filter completed orders in last 30 days
            Aggregation.match(Criteria.where("status").is("COMPLETED")
                                      .and("createdAt").gte(LocalDateTime.now().minusDays(30))),
            // Stage 2: unwind items array — one document per order item
            Aggregation.unwind("items"),
            // Stage 3: group by product category
            Aggregation.group("items.category")
                .sum("items.subtotal").as("revenue")
                .count().as("orderCount")
                .avg("items.subtotal").as("avgItemValue"),
            // Stage 4: sort descending by revenue
            Aggregation.sort(Sort.by(Sort.Direction.DESC, "revenue")),
            // Stage 5: take top N
            Aggregation.limit(topN),
            // Stage 6: project final shape
            Aggregation.project("revenue", "orderCount", "avgItemValue")
                       .and("_id").as("category")
        );
        return mongo.aggregate(pipeline, "orders", CategoryRevenue.class).getMappedResults();
    }

    // ✅ $lookup: MongoDB JOIN (equivalent to SQL LEFT JOIN)
    public List<OrderWithUser> getOrdersWithUsers() {
        Aggregation pipeline = Aggregation.newAggregation(
            Aggregation.lookup("users", "customerId", "_id", "userInfo"),  // JOIN users collection
            Aggregation.unwind("userInfo"),
            Aggregation.project("status", "total", "createdAt")
                       .and("userInfo.email").as("customerEmail")
        );
        return mongo.aggregate(pipeline, "orders", OrderWithUser.class).getMappedResults();
    }
}
```

### 💡 Lời khuyên thực tế

Dùng MongoDB khi dữ liệu tự nhiên là hierarchical/document-shaped và schema thay đổi thường xuyên. Cho analytics, aggregation pipeline mạnh nhưng cho reporting phức tạp, xem xét sync sang data warehouse. Luôn index field dùng trong $match và $sort.

### ❓ Câu hỏi phỏng vấn

- **Q:** Khi nào bạn embed vs reference document trong MongoDB?
  <details>
  <summary><b>Trả lời:</b></summary>

  Sử dụng **Embed** (nhúng trực tiếp) khi quan hệ là 1-1 hoặc 1-nhiều nhưng số lượng con nhỏ/giới hạn và dữ liệu con thường xuyên được đọc kèm với dữ liệu cha. Sử dụng **Reference** (tham chiếu bằng ID) khi quan hệ là nhiều-nhiều, số lượng bản ghi con tăng trưởng vô hạn (1-vô-cùng), hoặc dữ liệu con thường xuyên được truy cập độc lập.
  </details>
- **Q:** MongoDB aggregation pipeline là gì?
  <details>
  <summary><b>Trả lời:</b></summary>

  Là framework xử lý dữ liệu mạnh mẽ trong MongoDB hoạt động theo mô hình đường ống. Dữ liệu đi qua các giai đoạn (stages) biến đổi nối tiếp nhau như lọc (`$match`), gom nhóm (`$group`), sắp xếp (`$sort`), chiếu dữ liệu (`$project`) để trả ra kết quả tổng hợp cuối cùng.
  </details>
- **Q:** MongoDB xử lý transaction thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Kể từ phiên bản 4.0, MongoDB hỗ trợ Multi-Document Transactions cho cả Replica Sets và Sharded Clusters. Nó tuân thủ các thuộc tính ACID, sử dụng giao thức 2-phase commit nội bộ, hoạt động tương tự như transaction trong các hệ quản trị CSDL quan hệ.
  </details>
