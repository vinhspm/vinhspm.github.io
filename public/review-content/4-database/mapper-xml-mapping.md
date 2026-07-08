# Mapper Interface & XML Mapping

**Breadcrumb:** 4. Database › MyBatis

> MyBatis ánh xạ Java interface method sang SQL qua XML file hoặc annotation inline. XML namespace phải khớp đúng tên đầy đủ của interface; id của statement phải khớp tên method.

## Các điểm chính

- ✦ <code>@Mapper</code> trên interface; Spring Boot auto-scan với <code>@MapperScan("com.example.mapper")</code>.
- ✦ CRUD đơn giản: dùng annotation (<code>@Select, @Insert, @Update, @Delete</code>) trực tiếp trên method.
- ✦ SQL phức tạp: dùng XML mapper file — dễ đọc hơn cho query dài dòng, hỗ trợ dynamic SQL.
- ✦ <code>@Options(useGeneratedKeys=true, keyProperty="id")</code>: gán auto-increment PK ngược lại vào entity sau insert.
- ✦ <code>resultType</code>: class đơn giản, tự map tên cột sang field (camelCase nếu bật <code>mapUnderscoreToCamelCase=true</code>).

*Mapper với annotation và XML*
```xml
// Mapper interface
@Mapper
public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Long id);

    @Select("SELECT * FROM users WHERE email = #{email}")
    Optional<User> findByEmail(String email);

    @Insert("INSERT INTO users(name, email, status) VALUES(#{name}, #{email}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(User user);

    @Update("UPDATE users SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    // Query phức tạp → dùng XML
    List<User> searchUsers(UserQuery query);
}

// XML: src/main/resources/mapper/UserMapper.xml
/*
<mapper namespace="com.example.mapper.UserMapper">
  <select id="searchUsers" resultType="com.example.domain.User">
    SELECT id, name, email, status, created_at
    FROM users
    WHERE status = #{status}
      AND created_at >= #{startDate}
    ORDER BY created_at DESC
    LIMIT #{pageSize} OFFSET #{offset}
  </select>
</mapper>
*/
```

### 💡 Lời khuyên thực tế

Dùng annotation cho CRUD đơn giản một bảng, XML cho query có điều kiện động, JOIN nhiều bảng. Bật `mapUnderscoreToCamelCase: true` trong config MyBatis để tự map `user_name → userName` — giảm đáng kể boilerplate resultMap. Luôn dùng `@Options(useGeneratedKeys=true)` để lấy PK tự sinh ngược về entity sau insert.

### ❓ Câu hỏi phỏng vấn

- **Q:** Rủi ro khi dùng ${} thay vì #{} trong MyBatis?
  <details>
  <summary><b>Trả lời:</b></summary>

  Biểu thức `${}` chèn trực tiếp chuỗi ký tự thô vào câu SQL (String concatenation), gây ra nguy cơ cao bị tấn công **SQL Injection**. Biểu thức `#{} ` sử dụng cơ chế Prepared Statement (truyền tham số an toàn dưới dạng dấu `?`), giúp ngăn chặn triệt để SQL Injection.
  </details>
- **Q:** Lấy primary key tự sinh sau INSERT thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Cấu hình thuộc tính `useGeneratedKeys="true"` và chỉ định cột nhận giá trị qua `keyProperty="propertyName"` trong tag `<insert>` của file XML Mapper.
  </details>
- **Q:** Namespace trong XML mapper file liên hệ với Mapper interface thế nào?
  <details>
  <summary><b>Trả lời:</b></summary>

  Thuộc tính `namespace` trong file XML bắt buộc phải trỏ đúng đến tên đầy đủ (fully qualified name) của interface Mapper tương ứng để MyBatis có thể liên kết các phương thức của interface với các câu lệnh SQL trong XML.
  </details>
