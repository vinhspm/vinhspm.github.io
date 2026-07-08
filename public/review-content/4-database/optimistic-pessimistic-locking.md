# Optimistic vs Pessimistic Locking

**Breadcrumb:** 4. Database › JPA / Hibernate

> Optimistic locking kiểm tra xung đột tại thời điểm ghi (dùng version field); pessimistic locking ngăn xung đột bằng cách giữ DB lock trong khi đọc.

## Các điểm chính

- ✦ **Optimistic**: field <code>@Version</code>. Hibernate thêm <code>AND version=?</code> vào UPDATE. Nếu 0 hàng cập nhật → <code>OptimisticLockException</code>.
- ✦ **Pessimistic**: <code>LockModeType.PESSIMISTIC_WRITE</code> → <code>SELECT FOR UPDATE</code>. Row bị lock đến khi commit.
- ✦ Optimistic: throughput tốt hơn, tốt cho low-contention. Có thể cần retry logic khi xung đột.
- ✦ Pessimistic: ngăn xung đột hoàn toàn nhưng làm tổn hại concurrency (người khác chờ hoặc timeout).
- ✦ <code>@Retryable</code> (Spring Retry) có thể tự động retry khi <code>OptimisticLockException</code>.

*Optimistic (@Version + @Retryable) vs Pessimistic (@Lock PESSIMISTIC_WRITE + SELECT FOR UPDATE) — khi nào dùng mỗi loại*
```java
// ✅ Optimistic Locking — use when contention is LOW (e.g., user profile update)
// @Version field: Hibernate adds AND version=? to every UPDATE
@Entity
@Table(name = "products")
public class Product {
    @Id
    private Long id;
    private String name;
    private int stock;

    @Version
    private Long version;  // starts at 0; Hibernate increments on every successful UPDATE
}

@Service
public class ProductService {

    @Transactional
    @Retryable(value = OptimisticLockException.class,
               maxAttempts = 3,
               backoff = @Backoff(delay = 50, multiplier = 2))
    public void decrementStock(Long productId, int qty) {
        Product p = productRepository.findById(productId).orElseThrow();
        if (p.getStock() < qty) throw new OutOfStockException();
        p.setStock(p.getStock() - qty);
        // At flush: UPDATE products SET stock=8, version=2 WHERE id=99 AND version=1
        //                                                         ↑ version mismatch?
        // If another thread updated stock between our load and flush:
        //   → Hibernate sees 0 rows updated → throws OptimisticLockException
        //   → @Retryable retries (re-reads fresh stock, tries again)
    }
}

// ✅ Pessimistic Locking — use when contention is HIGH (e.g., flash sale, ticket booking)
// SELECT FOR UPDATE: locks the row immediately; other transactions wait until we commit
@Service
public class TicketService {

    @Transactional
    public BookingResult bookTicket(Long eventId, Long userId) {
        // PESSIMISTIC_WRITE → SELECT * FROM events WHERE id=? FOR UPDATE
        Event event = eventRepository.findById(eventId, LockModeType.PESSIMISTIC_WRITE)
                                     .orElseThrow();
        if (event.getAvailableSeats() <= 0) {
            throw new SoldOutException("Event " + eventId + " is sold out");
        }
        event.setAvailableSeats(event.getAvailableSeats() - 1);  // safe — we hold the row lock
        Booking booking = new Booking(eventId, userId, LocalDateTime.now());
        bookingRepository.save(booking);
        return BookingResult.success(booking.getId());
    }  // ← COMMIT: lock released, next waiting transaction proceeds
}

// ✅ Repository helper for pessimistic lock:
public interface EventRepository extends JpaRepository<Event, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);
}
```

### 💡 Lời khuyên thực tế

Với tình huống đặt chỗ hoặc giảm tồn kho, pessimistic an toàn hơn khi contention cao (ngăn oversell mà không retry). Với cập nhật profile user có xác suất xung đột thấp, optimistic với retry có thể scale tốt hơn.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: JPA ném exception nào khi xung đột optimistic lock?</b></summary>

JPA ném ra `OptimisticLockException` (trong Spring Data JPA thường được bọc lại thành `ObjectOptimisticLockingFailureException`).
</details>

<details>
<summary><b>Q: @Version hoạt động nội bộ thế nào?</b></summary>

Hibernate lưu giữ giá trị phiên bản ban đầu khi tải thực thể. Khi flush dữ liệu, nó chèn điều kiện so sánh `WHERE id = ? AND version = old_version` vào câu lệnh update. Nếu bản ghi đã bị thay đổi bởi transaction khác, số hàng bị tác động trả về là 0, kích hoạt lỗi xung đột khóa.
</details>

<details>
<summary><b>Q: Khi nào pessimistic locking có thể gây deadlock?</b></summary>

Khi hai transaction đồng thời cố gắng khóa chéo các tài nguyên của nhau theo thứ tự ngược nhau (ví dụ: T1 khóa hàng A rồi yêu cầu khóa hàng B; trong khi T2 đang giữ khóa hàng B và yêu cầu khóa hàng A).
</details>
