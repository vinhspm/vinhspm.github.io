# Adapter Pattern

**Breadcrumb:** 10. Design Patterns › Structural

> Adapter chuyển đổi một interface sang interface khác mà client mong đợi, cho phép interface không tương thích hoạt động cùng nhau mà không cần sửa code hiện có.

## Các điểm chính

- ✦ Object Adapter: bọc qua composition (ưu tiên — linh hoạt hơn).
- ✦ Class Adapter: extends adaptee — cần multiple inheritance, không idiomatic trong Java.
- ✦ Use case: tích hợp legacy system, thư viện bên thứ ba, API versioning.
- ✦ Spring: <code>HandlerAdapter</code> (adapt loại handler khác nhau cho DispatcherServlet), <code>WebMvcConfigurer</code>.

*Adapter bọc legacy payment system*
```java
// Adapting legacy payment to new interface
interface PaymentGateway { ChargeResult charge(ChargeRequest req); }

// Legacy API we can't change
interface LegacyPayment { void charge(String card, double amount, String currency); }

// Adapter (composition)
class LegacyPaymentAdapter implements PaymentGateway {
    private final LegacyPayment legacy;
    LegacyPaymentAdapter(LegacyPayment l){ legacy=l; }

    @Override public ChargeResult charge(ChargeRequest req){
        legacy.charge(req.getCardNumber(), req.getAmountAsDouble(), req.getCurrency());
        return new ChargeResult("OK", generateRef());
    }
}

// Client uses new interface, unaware of legacy
PaymentGateway gw = new LegacyPaymentAdapter(new LegacyPaymentImpl());
gw.charge(new ChargeRequest("4111...", 9999, "USD"));
```

### 💡 Lời khuyên thực tế

Viết Adapter khi tích hợp payment provider bên thứ ba mới, storage backend hoặc messaging system. Service code không thay đổi; chỉ adapter implementation khác nhau mỗi provider.

### ❓ Câu hỏi phỏng vấn

- **Q:** Sự khác biệt giữa Adapter và Bridge?
- **Q:** Khi nào dùng Adapter vs rewrite interface?
- **Q:** Spring HandlerAdapter implement Adapter pattern thế nào?
