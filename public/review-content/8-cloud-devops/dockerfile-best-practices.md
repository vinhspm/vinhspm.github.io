# Dockerfile Best Practices

**Breadcrumb:** 8. Cloud & DevOps › Docker

> Dockerfile tốt tạo ra image nhỏ, bảo mật, build nhanh bằng cách dùng base image tối giản, layer caching, non-root user và tránh secret trong layer.

## Các điểm chính

- ✦ Dùng base image tag cụ thể, không bao giờ <code>:latest</code> — đảm bảo reproducibility.
- ✦ Dùng Alpine hoặc distroless để giảm attack surface và kích thước image.
- ✦ Kết hợp lệnh RUN với <code>&&</code> để giảm số lượng layer và tránh cache package list trung gian.
- ✦ Đừng bao giờ hardcode secret trong Dockerfile — dùng build arg hoặc biến môi trường runtime.
- ✦ Dùng <code>.dockerignore</code> để loại trừ <code>target/</code>, <code>*.md</code>, <code>.git</code> khỏi build context.
- ✦ Instruction <code>HEALTHCHECK</code>: Docker giám sát container health.

*Dockerfile best practices: .dockerignore, pin tag, combine RUN, non-root, exec ENTRYPOINT, CI tagging, trivy scan*
```dockerfile
# ── .dockerignore — keep build context lean ──
target/          # compiled output — already in jar, never re-copy
.git/            # version history — irrelevant, can be hundreds of MB
*.md             # documentation
*.log            # runtime logs
.env             # local secrets — NEVER include in image
.idea/           # IDE project files

# ── Dockerfile best practices: order-service ──
FROM eclipse-temurin:21.0.3_9-jre-alpine    # pin exact tag — never :latest

# Combine RUN commands: apk cache dropped in same layer (--no-cache) → smaller image
# Combining addgroup + adduser in one RUN avoids an extra intermediate layer
RUN apk add --no-cache curl  && addgroup -S appgroup  && adduser  -S appuser -G appgroup

USER appuser        # drop root privileges before any COPY
WORKDIR /app

# --chown at COPY time — file owned by appuser, not root
COPY --from=build --chown=appuser:appgroup /app/target/order-service-*.jar app.jar

# HEALTHCHECK: Docker daemon restarts unhealthy container (complements K8s probes)
# --start-period: grace period before first check (JVM warmup ~30-60 s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3   CMD curl -sf http://localhost:8080/actuator/health/readiness || exit 1

EXPOSE 8080

# Exec form (JSON array): process receives OS signals directly — enables graceful shutdown
# Shell form would wrap in /bin/sh -c → JVM never gets SIGTERM → abrupt kill
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

# ── CI image tagging best practice ──
# NEVER use :latest in production — makes rollback unpredictable
# Tag with git SHA for exact traceability and rollback:
#   docker build -t myrepo/order-service:${GIT_SHA} .
#   kubectl set image deployment/order-service order-service=myrepo/order-service:${GIT_SHA}

# ── Post-build vulnerability scan (fail CI on HIGH/CRITICAL) ──
#   trivy image myrepo/order-service:${GIT_SHA} --exit-code 1 --severity HIGH,CRITICAL
```

### 💡 Lời khuyên thực tế

Scan image với `trivy` hoặc `docker scout` cho vulnerability. Đặt image tag với git SHA trong CI (`myapp:${GIT_SHA}`) để traceability. Không bao giờ dùng `:latest` trong production — khiến rollback không thể đoán trước.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Tại sao bạn nên tránh chạy container với root?</b></summary>

Vì lý do bảo mật: nếu kẻ tấn công khai thác được lỗ hổng bảo mật bên trong container chạy quyền root, họ có thể thoát ra ngoài container và chiếm toàn quyền kiểm soát máy chủ vật lý (host).
</details>

<details>
<summary><b>Q: .dockerignore file là gì và tại sao quan trọng?</b></summary>

Là file khai báo các thư mục/file không được gửi lên Docker Daemon lúc build image (như `node_modules`, `.git`, local build artifacts). Quan trọng vì giúp tăng tốc độ build image và giảm kích thước image, tránh lộ thông tin nhạy cảm.
</details>

<details>
<summary><b>Q: Làm thế nào để xử lý secret cần thiết lúc build time vs runtime?</b></summary>

Build time: Dùng tính năng `--secret` của Docker BuildKit để truyền an toàn (không bị ghi đè vào layer history). Runtime: Truyền qua biến môi trường hoặc mount volume bảo mật (như Kubernetes Secrets) khi chạy container.
</details>
