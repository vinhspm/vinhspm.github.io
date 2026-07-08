# Docker Networking & Volumes

**Breadcrumb:** 8. Cloud & DevOps › Docker

> Docker networking kết nối container; volume lưu trữ dữ liệu ngoài container — hiểu cả hai thiết yếu để chạy stateful service và ứng dụng multi-container.

## Các điểm chính

- ✦ **Bridge network**: mặc định. Container cùng bridge có thể giao tiếp theo tên.
- ✦ **Host network**: container chia sẻ network stack host (chỉ Linux). Không có isolation.
- ✦ **Overlay network**: multi-host networking cho Swarm/Kubernetes.
- ✦ **Volume**: được quản lý bởi Docker, tồn tại sau khi container bị xóa. Mount tại <code>/var/lib/docker/volumes/</code>.
- ✦ **Bind mount**: map thư mục host đến container path. Tốt cho dev (hot reload).

*Docker Compose: order-service + postgres + redis, named volume, healthcheck depends_on, Docker DNS service discovery, .env secrets*
```dockerfile
# ── docker-compose.yml: order-service + postgres + redis (local dev stack) ──
version: '3.9'

services:
  order-service:
    build: .                                   # build from local Dockerfile
    ports: ["8080:8080"]
    networks: [backend]
    environment:
      # "postgres" and "redis" resolve via Docker DNS within the backend network
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/orders
      SPRING_DATASOURCE_USERNAME: orders_user
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}   # read from .env — never hardcode
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: "6379"
    depends_on:
      postgres: {condition: service_healthy}    # wait for DB to be ready
      redis:    {condition: service_healthy}
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB:       orders
      POSTGRES_USER:     orders_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      # Named volume: survives "docker compose down" (removed only by "down -v")
      - pgdata:/var/lib/postgresql/data
      # Seed schema on first start (only runs if data dir is empty)
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orders_user -d orders"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks: [backend]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

volumes:
  pgdata:     # Docker-managed; bind path: /var/lib/docker/volumes/pgdata/_data

networks:
  backend:
    driver: bridge   # containers reach each other by service name (Docker DNS)
```

### 💡 Lời khuyên thực tế

Trong K8s, Docker volume chuyển thành PersistentVolumeClaim (PVC). Named volume được ưu tiên hơn bind mount trong production. Dùng `depends_on` với healthcheck để đảm bảo DB sẵn sàng trước khi app khởi động.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa Docker volume và bind mount là gì?</b></summary>

Docker Volume được quản lý hoàn toàn bởi Docker trong một thư mục riêng biệt bảo mật của Docker host. Bind Mount liên kết trực tiếp một thư mục tuỳ ý từ máy chủ vật lý (host path) vào container, phụ thuộc vào cấu trúc thư mục của OS máy chủ.
</details>

<details>
<summary><b>Q: Container trên cùng Docker network giao tiếp thế nào?</b></summary>

Giao tiếp trực tiếp với nhau thông qua cơ chế phân giải tên miền DNS nội bộ bằng tên của Container (container_name).
</details>

<details>
<summary><b>Q: Điều gì xảy ra với dữ liệu trong container khi container bị xóa?</b></summary>

Dữ liệu nằm trong lớp ghi tạm thời (writable layer) sẽ bị xóa sạch hoàn toàn. Chỉ có dữ liệu được lưu trữ trong các Mount/Volume được liên kết mới được bảo toàn trên máy chủ.
</details>
