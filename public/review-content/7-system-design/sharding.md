# Database Sharding

**Breadcrumb:** 7. System Design › Database Scaling

> Sharding phân vùng dữ liệu qua nhiều database instance (shard) để mỗi shard giữ một phần dữ liệu — cho phép horizontal write scaling vượt quá khả năng một node.

## Các điểm chính

- ✦ **Range sharding**: shard theo key range (A-M → shard1, N-Z → shard2). Đơn giản, nhưng hotspot trên sequential key.
- ✦ **Hash sharding**: shard = <code>hash(key) % N</code>. Phân phối đều, nhưng range query hit tất cả shard.
- ✦ **Directory sharding**: bảng lookup map key → shard. Linh hoạt, nhưng bảng lookup là bottleneck.
- ✦ Cross-shard operation: JOIN và transaction qua shard rất phức tạp hoặc không thể.
- ✦ Resharding: thêm shard cần migrate dữ liệu. Dùng consistent hashing để giảm thiểu migration.
- ✦ Application-level sharding (thủ công) vs middleware sharding (Vitess, Citus, ProxySQL).

*Hash sharding router; cross-shard query anti-pattern; resharding + Vitess/Citus recommendation*
```java
// Application-level hash sharding by userId (horizontal write scale)
@Component
public class ShardRouter {
    private final List<DataSource> shards; // shard-0, shard-1, shard-2, shard-3
    private final int shardCount;

    public ShardRouter(List<DataSource> shards) {
        this.shards = shards;
        this.shardCount = shards.size();
    }

    // Hash sharding: same userId always routes to same shard
    public DataSource getShardForUser(String userId) {
        int shardIndex = Math.abs(userId.hashCode()) % shardCount;
        return shards.get(shardIndex);
    }

    // Range sharding (alternative): A-F → shard-0, G-M → shard-1, etc.
    // Risk: hotspot if names starting with 'A' are most popular
}

// Repository using shard router
@Repository @RequiredArgsConstructor
public class ShardedOrderRepository {

    public Order findOrder(String orderId, String userId) {
        DataSource shard = shardRouter.getShardForUser(userId);
        // Use JdbcTemplate or JPA with dynamic DataSource
        return jdbcTemplate(shard).queryForObject(
            "SELECT * FROM orders WHERE id = ? AND user_id = ?",
            ORDER_ROW_MAPPER, orderId, userId);
    }

    // Cross-shard query — EXPENSIVE: must query ALL shards
    public List<Order> findOrdersByStatus(OrderStatus status) {
        return shards.parallelStream()  // query all shards in parallel
            .flatMap(shard -> jdbcTemplate(shard)
                .query("SELECT * FROM orders WHERE status = ?",
                    ORDER_ROW_MAPPER, status.name()).stream())
            .collect(Collectors.toList());
        // Avoid this pattern — design your sharding key to eliminate cross-shard queries
    }
}

// Resharding: adding shard-4 requires migrating ~25% of data
// Use consistent hashing to minimize: only 1/5 of data needs to move (not 1/4)

// Recommendation: use managed sharding solutions instead of manual:
// - Vitess (MySQL): transparent sharding, connection pooling, resharding online
// - Citus (PostgreSQL): distributed tables, parallel queries across shards
// - PlanetScale (MySQL): schema migrations without downtime, branch-based workflow
```

### 💡 Lời khuyên thực tế

Sharding là phương án cuối cùng cho write scaling. Trước khi sharding: connection pooling (PgBouncer), read replica, caching, archive dữ liệu cũ, DB vertical scaling. Mỗi cái này đơn giản hơn. Nếu phải shard, dùng sharding framework (Vitess, Citus) thay vì làm thủ công.

### ❓ Câu hỏi phỏng vấn

- **Q:** Trade-off giữa range sharding và hash sharding là gì?
- **Q:** Cross-shard join hoạt động thế nào?
- **Q:** Resharding là gì và tại sao khó?
