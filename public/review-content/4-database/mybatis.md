# Tổng Quan MyBatis

**Breadcrumb:** 4. Database

> MyBatis là persistence framework ánh xạ Java interface method sang SQL statement qua XML hoặc annotation. Khác với JPA/Hibernate, MyBatis giữ SQL tường minh — toàn quyền kiểm soát query trong khi tự động xử lý parameter binding và result mapping.

## Các điểm chính

- ✦ **SQL-first**: bạn viết SQL; MyBatis lo parameter binding (PreparedStatement) và result mapping.
- ✦ **Mapper interface**: Java interface với <code>@Mapper</code>; Spring Boot tự inject implementation.
- ✦ XML mapper file: SQL nằm trong XML; namespace = tên đầy đủ của interface.
- ✦ <code>#{param}</code>: PreparedStatement binding (an toàn với SQL injection). <code>${param}</code>: string substitution (nguy hiểm — tránh dùng với user input).
- ✦ **vs JPA**: MyBatis = SQL tường minh (dễ debug, dự đoán được); JPA = SQL tự generate (ít boilerplate, nhiều "magic").
- ✦ **Chọn MyBatis khi**: query phức tạp, SQL do DBA quản lý, stored procedure, đường dẫn performance-critical.

### 💡 Lời khuyên thực tế

Nhiều công ty tech gốc Trung Quốc (Alibaba, Baidu ecosystem) ưa MyBatis vì SQL tường minh và có thể kiểm soát. Nếu JD nhắc MyBatis, expect phỏng vấn viết dynamic SQL. Rule tuyệt đối: luôn dùng `#{}` cho user input — `${}` là string interpolation, mở cửa cho SQL injection.

### ❓ Câu hỏi phỏng vấn

- **Q:** #{} và ${} trong MyBatis khác nhau thế nào?
- **Q:** MyBatis ngăn SQL injection thế nào so với nối chuỗi?
- **Q:** Khi nào chọn MyBatis thay vì JPA/Hibernate?
