# Mocking

**Breadcrumb:** 9. Testing

> Mocking thay thế dependency thật bằng test double có kiểm soát, cô lập unit đang test khỏi database, HTTP client và external system khác.

## Các điểm chính

- ✦ **Mock**: tất cả method trả về default (null, 0, empty) trừ khi được stub. Verify interaction.
- ✦ **Spy**: bọc object thật; method thật theo default, chỉ stub một số cụ thể.
- ✦ **Stub**: response được lập trình sẵn qua <code>when(...).thenReturn(...)</code>.
- ✦ **Captor**: capture argument được truyền vào mocked method để assertion chi tiết.
- ✦ Over-mocking: test chỉ verify interaction (không verify kết quả) dễ vỡ — mock infrastructure, không mock business object.

*ArgumentCaptor và kiểm tra interaction*
```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock PaymentGateway gateway;
    @Mock NotificationService notifier;
    @Captor ArgumentCaptor<ChargeRequest> chargeCaptor;
    @InjectMocks PaymentService service;

    @Test
    void charge_sendsCorrectAmountToGateway(){
        service.charge("user1", Money.of(5000, "USD"));
        verify(gateway).charge(chargeCaptor.capture());
        assertThat(chargeCaptor.getValue().getAmountCents()).isEqualTo(5000);
        verify(notifier).sendReceipt(eq("user1"), any());
    }
    @Test
    void charge_gatewayThrows_sendsFailure(){
        when(gateway.charge(any())).thenThrow(new GatewayException());
        assertThrows(PaymentException.class, () -> service.charge("user1", any()));
        verify(notifier).sendFailure(eq("user1"), any());
    }
}
```

### 💡 Lời khuyên thực tế

Mock tại service boundary: repo, HTTP client, message publisher. Đừng mock domain object — test chúng trực tiếp. Dùng ArgumentCaptor khi cần verify cái gì được truyền, không chỉ là method có được gọi.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa mock, stub và spy?</b></summary>

Stub: Chỉ trả về dữ liệu cứng được cấu hình sẵn. Mock: Đối tượng giả lập được cấu hình hành vi và có thể xác minh cuộc gọi. Spy: Đối tượng thật được bọc lại, chạy code thật nhưng cho phép stub/mock một số hàm hoặc xác minh cuộc gọi.
</details>

<details>
<summary><b>Q: Khi nào KHÔNG nên mock?</b></summary>

Không nên mock các lớp tiện ích (utility classes), các đối tượng chứa trạng thái dữ liệu đơn thuần (DTO, Entity, Value Object), hoặc các thư viện lõi của JDK (như List, Map).
</details>

<details>
<summary><b>Q: ArgumentCaptor dùng để làm gì?</b></summary>

Dùng để bắt (capture) và lấy ra giá trị của tham số truyền vào một phương thức mock khi nó được gọi, giúp ta kiểm tra tính chính xác của dữ liệu logic bên trong tham số đó.
</details>
