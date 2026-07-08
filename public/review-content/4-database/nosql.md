# Cơ Sở Dữ Liệu NoSQL

**Breadcrumb:** 4. Database

> DB NoSQL đánh đổi relational consistency/SQL để lấy schema linh hoạt, horizontal scalability và data model chuyên biệt (document, key-value, wide-column, graph).

## Các điểm chính

- ✦ **Key-Value**: Redis, DynamoDB — O(1) lookup theo key. Tốt cho caching, session.
- ✦ **Document**: MongoDB, Firestore — document giống JSON, schema linh hoạt, dữ liệu lồng nhau.
- ✦ **Wide-Column**: Cassandra, HBase — hàng với cột động; xuất sắc cho time-series, IoT.
- ✦ **Graph**: Neo4j — node và edge; query duyệt relationship hiệu quả.
- ✦ CAP: hầu hết NoSQL chọn Availability + Partition Tolerance (AP) thay vì Consistency.

*NoSQL type decision matrix: Redis (key-value), MongoDB (document), Cassandra (wide-column), Neo4j (graph)*
```sql
// ✅ NoSQL decision matrix for an e-commerce platform

// Key-Value (Redis): O(1) lookup — perfect for session, cart cache, rate limiting
// String: GET/SET user session token
// Hash:   HGETALL cart:user:42 → {productId: qty, ...}
// ZSet:   ZADD leaderboard score userId → sorted rankings
// TTL:    EXPIRE session:abc123 1800 → auto-expire in 30 min

// Document (MongoDB): schema-flexible product catalog
// Products have wildly different attributes per category:
{
  "_id": "prod_001",
  "name": "iPhone 15 Pro",
  "category": "Electronics",
  "price": 999.00,
  "specs": {                         // ← Electronics-specific nested object
    "storage": "256GB", "color": "Titanium", "chip": "A17 Pro"
  },
  "reviews": [                       // ← Embedded reviews (co-located with product)
    { "userId": "u42", "rating": 5, "text": "Great phone!", "date": "2024-01-10" }
  ],
  "tags": ["smartphone", "5G", "apple"]
}
// Relational equivalent: product + product_specs + reviews tables + EAV anti-pattern

// Wide-Column (Cassandra): high-write time-series / event logs
// Designed for: millions of order_events/sec across distributed nodes
// Row key = order_id (partition key), column = event_timestamp
// No joins; query pattern must be defined at schema design time

// Graph (Neo4j): relationship traversal — "customers who bought X also bought Y"
// MATCH (u:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(other:User)
//       -[:PURCHASED]->(rec:Product)
// WHERE u.id = 42 AND NOT (u)-[:PURCHASED]->(rec)
// RETURN rec, COUNT(*) AS frequency ORDER BY frequency DESC LIMIT 5

// ✅ When to choose each:
// Redis:     session store, distributed cache, pub/sub, rate limiting, leaderboard
// MongoDB:   catalog with variable schema, content management, user-generated content
// Cassandra: IoT sensor data, activity logs, time-series analytics
// Neo4j:     social graph, fraud detection, recommendation engine
```

### 💡 Lời khuyên thực tế

Chọn NoSQL khi: cần horizontal scale qua nhiều node, dữ liệu tự nhiên là document/graph, hoặc cần schema evolution linh hoạt. Đừng chọn NoSQL để tránh SQL — hầu hết vấn đề scalability được giải quyết với SQL indexing đúng đắn.

### ❓ Câu hỏi phỏng vấn

- **Q:** Khi nào bạn chọn MongoDB thay vì PostgreSQL?
  <details>
  <summary><b>Trả lời:</b></summary>

  Chọn MongoDB khi dữ liệu có cấu trúc không đồng nhất/thay đổi liên tục (schema-less), dữ liệu dạng tài liệu phân cấp phức tạp cần lưu trữ tự nhiên dưới dạng JSON/BSON, hoặc khi hệ thống đòi hỏi khả năng mở rộng ngang (horizontal scaling/sharding) dễ dàng.
  </details>
- **Q:** BASE có nghĩa gì trong ngữ cảnh NoSQL?
  <details>
  <summary><b>Trả lời:</b></summary>

  BASE đối lập với ACID, đại diện cho: **B**asically **A**vailable (luôn khả dụng cơ bản), **S**oft-state (trạng thái dữ liệu có thể biến đổi theo thời gian ngay cả khi không có ghi mới), và **E**ventual consistency (nhất quán sau cùng - dữ liệu sẽ đạt trạng thái nhất quán sau một khoảng thời gian).
  </details>
- **Q:** Cassandra đạt write throughput cao thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Cassandra sử dụng kiến trúc không có node chính phụ (masterless peer-to-peer) kết hợp với cấu trúc ghi tuần tự vào bộ nhớ đệm (Memtable) và ghi đè tuần tự xuống file log (CommitLog), sau đó định kỳ xả xuống đĩa (SSTable) mà không tốn công đọc trước khi ghi (no read-before-write), giúp tối đa tốc độ ghi đĩa vật lý.
  </details>
