# Database Transaction

**Breadcrumb:** 4. Database

> Transaction nhóm nhiều thao tác thành đơn vị atomic — tất cả thành công (COMMIT) hoặc tất cả thất bại (ROLLBACK) — đảm bảo thuộc tính ACID cho tính toàn vẹn dữ liệu.

## Các điểm chính

- ✦ **ACID**: Atomicity, Consistency, Isolation, Durability.
- ✦ BEGIN → thao tác → COMMIT hoặc ROLLBACK.
- ✦ Savepoint: rollback một phần trong transaction.
- ✦ Isolation level kiểm soát transaction đồng thời có thể thấy gì từ thay đổi đang thực hiện của nhau.
- ✦ Transaction dài giữ lock — giữ transaction ngắn để giảm contention.

*SQL transaction (multi-step payment) + Spring @Transactional + Savepoint pattern*
```java
-- ✅ SQL transaction: payment capture must debit wallet AND record payment atomically
BEGIN;
  -- Step 1: debit customer wallet — fail if insufficient balance
  UPDATE users
  SET wallet_balance = wallet_balance - 250.00
  WHERE id = 101 AND wallet_balance >= 250.00;  -- conditional update

  -- Step 2: verify exactly 1 row was updated (i.e., balance was sufficient)
  DO $$ BEGIN
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient balance for user 101';
    END IF;
  END $$;

  -- Step 3: create payment record
  INSERT INTO payments (order_id, user_id, amount, status, paid_at)
  VALUES (5001, 101, 250.00, 'CAPTURED', NOW());

  -- Step 4: mark order as paid
  UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = 5001;

COMMIT;  -- all 3 writes committed together (Atomicity)
-- If any step throws → implicit ROLLBACK (no partial state)

-- ✅ Spring @Transactional equivalent — same guarantees, less boilerplate
@Service
public class PaymentService {

    @Transactional  // starts transaction before method, commits on return, rolls back on RuntimeException
    public PaymentResult capturePayment(Long orderId, Long userId, BigDecimal amount) {
        // All repository calls share the SAME Connection / EntityManager
        User user = userRepository.findByIdForUpdate(userId);  // SELECT FOR UPDATE (pessimistic lock)
        if (user.getWalletBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("Balance too low");
            // ↑ RuntimeException → @Transactional triggers ROLLBACK automatically
        }
        user.deductBalance(amount);                      // dirty check → UPDATE on flush
        Payment payment = new Payment(orderId, userId, amount, PaymentStatus.CAPTURED);
        paymentRepository.save(payment);                 // INSERT
        orderRepository.updateStatus(orderId, OrderStatus.PAID);  // UPDATE
        return PaymentResult.success(payment.getId());
    }  // Transaction commits here; all changes flushed to DB atomically
}

// ✅ Savepoint: partial rollback within a transaction
// BEGIN;
//   INSERT INTO payments ...;
//   SAVEPOINT after_payment;
//   INSERT INTO audit_log ...;   -- this might fail
//   ROLLBACK TO SAVEPOINT after_payment;  -- undo only audit_log insert
//   COMMIT;  -- payment still committed
```

### 💡 Lời khuyên thực tế

Giữ method `@Transactional` ngắn và tránh HTTP call bên ngoài trong transaction (giữ DB connection + lock trong suốt thời gian đó). Dùng `@Transactional(timeout=5)` để ngăn transaction runaway.

### ❓ Câu hỏi phỏng vấn

- **Q:** ACID là viết tắt của gì và mỗi thuộc tính đảm bảo điều gì?
- **Q:** Điều gì xảy ra với transaction nếu server crash giữa hai update?
- **Q:** Tại sao bạn nên tránh transaction chạy lâu?
