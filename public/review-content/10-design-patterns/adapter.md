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

<details>
<summary><b>Q: Sự khác biệt giữa Adapter và Bridge?</b></summary>

Adapter dùng để chuyển đổi interface của một class hiện có thành một interface khác mà client mong muốn (giải quyết bất tương thích sau khi code đã được viết). Bridge tách biệt phần trừu tượng (abstraction) và phần triển khai (implementation) ngay từ khâu thiết kế ban đầu để chúng phát triển độc lập.
</details>

<details>
<summary><b>Q: Khi nào dùng Adapter vs rewrite interface?</b></summary>

Dùng Adapter khi code nguồn là thư viện bên thứ ba chỉ đọc, hoặc hệ thống cũ (legacy code) không thể chỉnh sửa trực tiếp. Dùng rewrite interface khi bạn sở hữu hoàn toàn mã nguồn và việc sửa đổi trực tiếp không gây ảnh hưởng lớn.
</details>

<details>
<summary><b>Q: Spring HandlerAdapter implement Adapter pattern thế nào?</b></summary>

Spring MVC hỗ trợ nhiều loại controller khác nhau (HTTPRequestHandler, Controller, Servlet). DispatcherServlet sử dụng HandlerAdapter để gọi phương thức xử lý request của từng loại handler tương ứng mà không cần biết chi tiết cấu trúc nội bộ của chúng.
</details>
