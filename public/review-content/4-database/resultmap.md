# ResultMap — Ánh Xạ Kết Quả Phức Tạp

**Breadcrumb:** 4. Database › MyBatis

> ResultMap định nghĩa mapping tường minh từ cột sang field cho JOIN query, nested object (association = has-one), và nested collection (collection = has-many). Đây là cách MyBatis xử lý dữ liệu quan hệ mà không gây N+1.

## Các điểm chính

- ✦ <code>resultType</code>: tự map theo tên cột. Đủ cho query một bảng.
- ✦ <code>resultMap</code>: cần khi tên cột khác field name, hoặc mapping kết quả JOIN sang nested object.
- ✦ <code>&lt;association property="address" javaType="Address"&gt;</code>: ánh xạ quan hệ has-one.
- ✦ <code>&lt;collection property="items" ofType="OrderItem"&gt;</code>: ánh xạ quan hệ has-many.
- ✦ Một JOIN query với <code>&lt;collection&gt;</code> tốt hơn nhiều so với N+1 select riêng.
- ✦ Bật <code>mapUnderscoreToCamelCase=true</code> để giảm boilerplate <code>&lt;result&gt;</code> tag.

*ResultMap với association và collection*
```xml
<!-- ResultMap: Order → Address (has-one) + List<OrderItem> (has-many) -->
<resultMap id="OrderRM" type="com.example.Order">
  <id     property="id"     column="o_id"/>
  <result property="userId" column="o_user_id"/>
  <result property="total"  column="o_total"/>

  <!-- has-one: embedded Address object -->
  <association property="address" javaType="com.example.Address">
    <result property="street" column="a_street"/>
    <result property="city"   column="a_city"/>
    <result property="zip"    column="a_zip"/>
  </association>

  <!-- has-many: List<OrderItem> từ các dòng JOIN -->
  <collection property="items" ofType="com.example.OrderItem">
    <id     property="id"        column="i_id"/>
    <result property="productId" column="i_product_id"/>
    <result property="quantity"  column="i_qty"/>
    <result property="price"     column="i_price"/>
  </collection>
</resultMap>

<!-- Một JOIN duy nhất — không N+1 -->
<select id="findOrderDetail" resultMap="OrderRM">
  SELECT o.id          AS o_id,   o.user_id  AS o_user_id, o.total   AS o_total,
         a.street      AS a_street, a.city   AS a_city,   a.zip     AS a_zip,
         i.id          AS i_id,   i.product_id AS i_product_id,
         i.quantity    AS i_qty,  i.price    AS i_price
  FROM orders o
  LEFT JOIN addresses   a ON a.order_id = o.id
  LEFT JOIN order_items i ON i.order_id = o.id
  WHERE o.id = #{id}
</select>
```

### 💡 Lời khuyên thực tế

Alias tất cả cột trong JOIN query (ví dụ `o.id AS o_id`) để tránh xung đột khi nhiều bảng có cột tên `id`. Dùng `&lt;collection&gt;` với JOIN cho hầu hết trường hợp — load tất cả trong một query. Chỉ dùng lazy `select` attribute (trigger query riêng mỗi record) khi nested data hiếm khi cần.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: resultType và resultMap khác nhau thế nào?</b></summary>

`resultType` dùng khi tên thuộc tính của Java class trùng với tên cột DB (hoặc tự động camelCase). `resultMap` dùng để cấu hình ánh xạ thủ công tùy biến, hoặc ánh xạ các quan hệ phức tạp 1-1, 1-nhiều.
</details>

<details>
<summary><b>Q: MyBatis xử lý quan hệ một-nhiều trong một query thế nào?</b></summary>

Sử dụng tag `<resultMap>` kết hợp tag con `<collection>` để gom các dòng dữ liệu phẳng từ kết quả `JOIN` thành danh sách đối tượng lồng nhau.
</details>

<details>
<summary><b>Q: Ngăn N+1 query trong MyBatis thế nào?</b></summary>

Tránh dùng tag `<association>` hoặc `<collection>` có thuộc tính `select` vì nó sẽ tạo truy vấn bổ sung cho mỗi dòng. Hãy dùng `JOIN` trong một SQL duy nhất và ánh xạ qua resultMap.
</details>
