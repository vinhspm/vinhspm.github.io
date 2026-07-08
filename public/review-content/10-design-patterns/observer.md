# Observer Pattern

**Breadcrumb:** 10. Design Patterns › Behavioral

> Observer định nghĩa quan hệ one-to-many trong đó subject thông báo tất cả observer đã đăng ký khi state thay đổi — nền tảng của event-driven system.

## Các điểm chính

- ✦ Subject (publisher): duy trì danh sách observer, thông báo khi state thay đổi.
- ✦ Observer (subscriber): implement <code>update(event)</code>.
- ✦ Decoupled: subject không biết loại observer, chỉ biết interface.
- ✦ Spring: <code>ApplicationEventPublisher</code> + <code>@EventListener</code>. Async với <code>@Async</code>.
- ✦ Synchronous mặc định: exception của observer rollback transaction của publisher.

*Spring ApplicationEvent Observer với @Async*
```java
// Spring event-driven Observer
public record OrderPlacedEvent(Long orderId, String userId, BigDecimal total){}

@Service public class OrderService {
    @Autowired ApplicationEventPublisher pub;
    @Transactional
    public Order place(OrderRequest req){
        Order o = repo.save(new Order(req));
        pub.publishEvent(new OrderPlacedEvent(o.getId(), req.getUserId(), o.getTotal()));
        return o;
    }
}
// Observers — completely decoupled from OrderService
@Component class EmailObs {
    @EventListener @Async
    void on(OrderPlacedEvent e){ email.sendConfirmation(e.userId()); }
}
@Component class InventoryObs {
    @EventListener void on(OrderPlacedEvent e){ inventory.reserve(e.orderId()); }
}
```

### 💡 Lời khuyên thực tế

Dùng @Async cho observer để tách biệt thất bại của chúng khỏi transaction của publisher. Để quan sát cross-service, dùng Kafka — Spring event chỉ trong process. Dùng @TransactionalEventListener để fire sau khi transaction commit.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa push và pull Observer model?</b></summary>

Push: Subject chủ động gửi toàn bộ dữ liệu cập nhật mới sang cho Observer thông qua tham số hàm. Pull: Subject chỉ thông báo có thay đổi, và Observer sẽ tự gọi ngược lại các hàm của Subject để lấy dữ liệu cụ thể mà nó cần.
</details>

<details>
<summary><b>Q: Điều gì xảy ra khi synchronous @EventListener throw exception?</b></summary>

Vì là đồng bộ, exception sẽ chặn đứng luồng xử lý chính của transaction/request hiện tại và đẩy lỗi ngược lại cho client (có thể gây rollback transaction).
</details>

<details>
<summary><b>Q: @TransactionalEventListener khác @EventListener thế nào?</b></summary>

`@EventListener` kích hoạt ngay lập tức khi event được phát đi. `@TransactionalEventListener` trì hoãn việc kích hoạt cho đến khi transaction hiện tại đạt được một trạng thái cụ thể (ví dụ: chỉ chạy sau khi transaction đã commit thành công qua Phase.AFTER_COMMIT).
</details>
