# Consistent Hashing

**Breadcrumb:** 7. System Design › Load Balancing

> Consistent hashing map key lên node trên vòng tròn ảo, giảm thiểu remap key khi node được thêm hoặc xóa — thiết yếu cho distributed cache và sharding.

## Các điểm chính

- ✦ Traditional hashing: <code>node = hash(key) % N</code>. Thêm/xóa node → remap gần như tất cả key.
- ✦ Consistent hashing: đặt node trên vòng (0–2³²). Key map đến node tiếp theo theo chiều kim đồng hồ.
- ✦ Thêm node: chỉ key giữa node mới và predecessor được remap. Trung bình N/K key mỗi node.
- ✦ Virtual node (vnode): mỗi physical node có nhiều điểm trên vòng → phân phối tốt hơn.
- ✦ Được dùng bởi: DynamoDB, Cassandra, Redis Cluster, CDN, load balancer.

*Consistent hash ring với TreeMap + virtual nodes; Redis Cluster / Cassandra / DynamoDB usage*
```java
// Consistent hashing: minimize key remap when nodes added/removed
// Problem: hash(key) % N → adding 1 node remaps ~N/(N+1) keys (cache stampede!)
// Solution: consistent hashing remaps only ~K/N keys on average

// Java: TreeMap as consistent hash ring
public class ConsistentHashRouter {
    private final TreeMap<Integer, String> ring = new TreeMap<>();
    private static final int VNODES_PER_NODE = 150; // virtual nodes for even distribution

    public void addNode(String nodeId) {
        for (int i = 0; i < VNODES_PER_NODE; i++) {
            int hash = hash(nodeId + "-vnode-" + i);
            ring.put(hash, nodeId); // each physical node has 150 positions on ring
        }
    }

    public void removeNode(String nodeId) {
        for (int i = 0; i < VNODES_PER_NODE; i++) {
            ring.remove(hash(nodeId + "-vnode-" + i));
        }
    }

    // Route request to node: find next clockwise position from key's hash
    public String getNode(String key) {
        if (ring.isEmpty()) throw new IllegalStateException("No nodes available");
        int hash = hash(key);
        Map.Entry<Integer, String> entry = ring.ceilingEntry(hash);
        return (entry != null ? entry : ring.firstEntry()).getValue(); // wrap around
    }

    private int hash(String key) {
        // Use MurmurHash or MD5 for better distribution than Java hashCode()
        return Math.abs(key.hashCode()) % Integer.MAX_VALUE;
    }
}

// Usage: route order-events cache lookups to same node
// ConsistentHashRouter router = new ConsistentHashRouter();
// router.addNode("cache-node-1"); router.addNode("cache-node-2"); router.addNode("cache-node-3");
// String node = router.getNode("product-" + productId); // always same node for same productId
// redisNodes.get(node).get("product:" + productId);

// Real-world usage:
// Redis Cluster: 16384 hash slots distributed across nodes via consistent hashing
// Cassandra: token ring — each node owns a token range
// DynamoDB: partition key → consistent hash → storage node
// CDN: consistent hash to pick which edge server caches a URL
```

### 💡 Lời khuyên thực tế

Khi xây dựng distributed cache hoặc session store, consistent hashing đảm bảo thêm/xóa cache node chỉ phân phối lại ~1/N key. Không có nó, node hỏng hoặc thêm gây cache stampede (tất cả key miss đồng thời).

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Consistent hashing giải quyết vấn đề gì so với modulo hashing?</b></summary>

Modulo hashing (`hash(key) % N`) sẽ phải tính toán lại và di chuyển gần như toàn bộ dữ liệu khi số lượng node N thay đổi. Consistent Hashing giảm thiểu việc này, chỉ yêu cầu di chuyển trung bình `1/N` lượng dữ liệu khi thêm/bớt node.
</details>

<details>
<summary><b>Q: Virtual node là gì và tại sao dùng?</b></summary>

Là kỹ thuật ánh xạ một node vật lý thành nhiều node ảo trên vòng tròn hash ring. Dùng để phân bổ tải đều hơn trên các node, tránh hiện tượng các node vật lý bị phân bổ lệch tải (hotspots).
</details>

<details>
<summary><b>Q: Cassandra dùng consistent hashing cho phân phối dữ liệu thế nào?</b></summary>

Các node tạo thành một vòng tròn Token Ring. Khi dữ liệu được ghi, Cassandra băm khóa phân vùng (partition key) thành Token và ghi dữ liệu vào node đầu tiên quản lý phạm vi Token đó trên vòng tròn.
</details>
