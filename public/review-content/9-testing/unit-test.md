# Unit Testing

**Breadcrumb:** 9. Testing

> Unit test kiểm tra class/method riêng lẻ trong isolation — nhanh, không có external dependency, tạo nền tảng test pyramid và cho phép refactor an toàn.

## Các điểm chính

- ✦ Test pyramid: nhiều unit test → ít integration test hơn → rất ít E2E test.
- ✦ AAA pattern: **Arrange** (chuẩn bị), **Act** (thực thi), **Assert** (kiểm tra).
- ✦ JUnit 5: <code>@Test</code>, <code>@BeforeEach</code>, <code>@AfterEach</code>, <code>@BeforeAll</code>, <code>@AfterAll</code>.
- ✦ Không có Spring context trong unit test — khởi tạo class trực tiếp, mock dependency.
- ✦ Nhanh: hàng nghìn unit test phải chạy trong vài giây.

*JUnit 5 unit test theo AAA pattern*
```java
class OrderServiceTest {
    OrderRepository repo = mock(OrderRepository.class);
    PaymentGateway gateway = mock(PaymentGateway.class);
    OrderService service = new OrderService(repo, gateway);

    @Test
    void placeOrder_validRequest_savesAndChargesPayment(){
        // Arrange
        when(gateway.charge(any())).thenReturn(new ChargeResult("ch_123"));
        // Act
        Order result = service.placeOrder(validReq());
        // Assert
        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(repo).save(any(Order.class));
        verify(gateway).charge(any());
    }
    @Test
    void placeOrder_paymentFails_throwsException(){
        when(gateway.charge(any())).thenThrow(new PaymentDeclinedException());
        assertThrows(PaymentException.class, () -> service.placeOrder(validReq()));
    }
}
```

### 💡 Lời khuyên thực tế

Viết unit test cho: business logic, edge case, error path, domain rule. Không test getter/setter. Hướng đến coverage cao cho logic, không phải 100% line coverage (khuyến khích test vô nghĩa).

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Test pyramid là gì và tại sao quan trọng?</b></summary>

Là mô hình kim tự tháp kiểm thử: Unit Test ở đáy (số lượng nhiều nhất, chạy nhanh nhất, chi phí rẻ nhất) -> Integration Test ở giữa -> E2E Test ở đỉnh (ít nhất, chạy chậm nhất, chi phí đắt nhất). Quan trọng để tối ưu hóa thời gian phản hồi của kiểm thử và chi phí viết/bảo trì test.
</details>

<details>
<summary><b>Q: AAA pattern là gì?</b></summary>

Là cấu trúc chuẩn hóa cho một bài test: Arrange (thiết lập dữ liệu giả lập), Act (gọi hàm cần test), và Assert (kiểm tra kết quả trả về khớp mong muốn).
</details>

<details>
<summary><b>Q: Điều gì KHÔNG nên unit test?</b></summary>

Các thư viện bên thứ ba đã được kiểm thử, cấu hình framework, các đoạn code quá đơn giản như getter/setter thuần túy, hoặc các đoạn code liên quan trực tiếp đến UI/Hạ tầng mạng.
</details>
