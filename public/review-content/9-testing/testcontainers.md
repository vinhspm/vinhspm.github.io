# TestContainers

**Breadcrumb:** 9. Testing › Integration Test

> TestContainers khởi động real Docker container (Postgres, Redis, Kafka) trong khi chạy JUnit test, cung cấp môi trường giống production mà không có H2 compatibility issue.

## Các điểm chính

- ✦ <code>@Container</code> + <code>@Testcontainers</code>: lifecycle được quản lý bởi JUnit extension.
- ✦ Container <code>static</code>: chia sẻ qua các method test class (nhanh hơn). Non-static: container mới mỗi test.
- ✦ Hỗ trợ: PostgreSQL, MySQL, Redis, Kafka, RabbitMQ, MongoDB, Elasticsearch, LocalStack.
- ✦ Reuse mode: <code>.withReuse(true)</code> giữ container sống giữa các test run — iteration local nhanh.
- ✦ Lần chạy đầu pull Docker image — lần tiếp theo dùng cached image.

*Nhiều container với DynamicPropertySource*
```java
@SpringBootTest @Testcontainers
class InventoryTest {
    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @DynamicPropertySource static void config(DynamicPropertyRegistry r){
        r.add("spring.datasource.url",        pg::getJdbcUrl);
        r.add("spring.data.redis.host",       redis::getHost);
        r.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
    @Autowired InventoryRepository repo;
    @Test void decrementStock_concurrent_noOversell(){
        repo.save(new Inventory("p1", 10));
        IntStream.range(0,15).parallel()
            .forEach(i -> { try { repo.decrement("p1",1); } catch(Exception e){} });
        assertThat(repo.findByProductId("p1").getQuantity()).isGreaterThanOrEqualTo(0);
    }
}
```

### 💡 Lời khuyên thực tế

Thay tất cả H2 integration test bằng TestContainers Postgres — bắt được SQL syntax difference, constraint behavior và concurrent locking mà H2 xử lý khác hoặc không hỗ trợ.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: TestContainers có lợi thế gì so với H2?</b></summary>

Giúp chạy test trực tiếp trên chính database engine thật chạy ở production, loại bỏ hoàn toàn các lỗi sai khác về cú pháp SQL, hành vi Transaction và tính năng đặc thù giữa H2 và DB thật.
</details>

<details>
<summary><b>Q: Làm thế nào để chia sẻ container qua nhiều test class?</b></summary>

Định nghĩa container dưới dạng các trường static trong một Class cơ sở (Base Class) hoặc sử dụng Singleton Container pattern để tránh việc mỗi class test lại khởi động lại container mới từ đầu.
</details>

<details>
<summary><b>Q: TestContainers reuse mode là gì?</b></summary>

Là chế độ cho phép giữ lại các container Docker tiếp tục chạy sau khi chạy test xong; các lần chạy test tiếp theo sẽ tái sử dụng luôn container này giúp tăng tốc độ kiểm thử cục bộ.
</details>
