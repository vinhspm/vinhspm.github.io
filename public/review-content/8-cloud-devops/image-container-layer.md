# Image, Container & Layer

**Breadcrumb:** 8. Cloud & DevOps › Docker

> Docker image được tạo từ layer bất biến (mỗi instruction Dockerfile tạo một layer); container thêm thin writable layer lên trên image — chia sẻ tất cả layer read-only.

## Các điểm chính

- ✦ **Layer**: mỗi instruction <code>RUN</code>, <code>COPY</code>, <code>ADD</code> tạo layer read-only mới.
- ✦ Layer được cache: nếu instruction và context không thay đổi, Docker tái sử dụng cached layer (rebuild nhanh).
- ✦ **Image**: stack layer read-only + metadata.
- ✦ **Container**: image + thin writable layer (Union FS). Bị xóa khi container dừng trừ khi dùng volume.
- ✦ Tối ưu: đặt layer ít thay đổi trước (base OS, dependency), thay đổi thường xuyên sau (app code).

*Layer caching: BAD vs GOOD COPY order, layer size breakdown, dive inspection, shared base layers across microservices*
```java
# ── Docker layer caching deep-dive: order-service ──

# BAD: COPY . . invalidates ALL layers on any file change (src, README, .env…)
# Every rebuild re-downloads 200+ Maven deps → CI takes 5+ minutes
COPY . .
RUN mvn package -DskipTests

# ────────────────────────────────────────────────────────────────────────
# GOOD: split descriptor from source — dependency layer cached independently
# ────────────────────────────────────────────────────────────────────────
# Layer A: pom.xml only — cache miss only when deps change (rarely)
COPY pom.xml .
RUN mvn dependency:go-offline -q    # ~200 deps cached in this layer

# Layer B: source — cache miss on every commit (expected, fast ~20 s)
COPY src ./src
RUN mvn package -DskipTests -q

# ── Inspecting what each layer contains ──
# docker image history order-service:latest    # size per instruction
# dive order-service:latest                    # interactive explorer (brew install dive)

# ── Sharing base layers across all microservices ──
# order-service/Dockerfile:
FROM eclipse-temurin:21.0.3_9-jre-alpine    # ~190 MB, pulled once per host
# user-service/Dockerfile:
FROM eclipse-temurin:21.0.3_9-jre-alpine    # reuses cached base — 0 MB re-pulled

# ── Typical layer size breakdown ──
# Base JRE (eclipse-temurin alpine) : ~190 MB  (shared, pulled once per host)
# OS tools + non-root user          :   ~2 MB
# Maven dependency cache            : ~120 MB  (stable, rebuilt only on pom.xml change)
# Application fat-jar               :   ~8 MB  (rebuilt every commit — fast)
# Total                             : ~320 MB  vs ~600 MB without multi-stage
```

### 💡 Lời khuyên thực tế

Sắp xếp instruction Dockerfile từ ít-đến-nhiều-thay-đổi-thường-xuyên. Copy `pom.xml` và chạy `mvn dependency:go-offline` TRƯỚC khi copy source — dependency hiếm khi thay đổi và sẽ được cache qua các rebuild, tăng tốc CI đáng kể.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Tại sao bạn nên copy file descriptor gói trước source code trong Dockerfile?</b></summary>

Để tận dụng Docker cache cho lớp cài đặt dependency (như thư viện npm, maven). Nếu danh sách thư viện không đổi, Docker sẽ lấy luôn từ cache và bỏ qua bước tải lâu, chỉ biên dịch lại source code thay đổi phía sau.
</details>

<details>
<summary><b>Q: Điều gì xảy ra với writable layer khi container bị xóa?</b></summary>

Lớp writable layer sẽ bị xoá vĩnh viễn cùng với container. Mọi dữ liệu ghi trên đó sẽ bị mất hoàn toàn nếu không được lưu vào Docker Volume.
</details>

<details>
<summary><b>Q: Union filesystem cho phép chia sẻ layer giữa container thế nào?</b></summary>

UnionFS xếp chồng các layer chỉ đọc (read-only) của image lên nhau tạo ra một góc nhìn thư mục duy nhất. Nhiều container chạy chung một image sẽ chia sẻ chung các layer chỉ đọc này và chỉ sở hữu riêng một lớp ghi (writable layer) siêu nhẹ trên cùng.
</details>
