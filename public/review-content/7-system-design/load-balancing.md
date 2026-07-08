# Load Balancing

**Breadcrumb:** 7. System Design

> Load balancer phân phối request đến đến nhiều instance service để tối đa hóa throughput, giảm thiểu latency và đảm bảo high availability.

## Các điểm chính

- ✦ **L4 (Transport)**: route theo IP/port. Nhanh, không biết về HTTP. (TCP load balancing).
- ✦ **L7 (Application)**: route theo HTTP path/header/cookie. Cho phép URL-based routing, SSL termination, content inspection.
- ✦ Thuật toán: Round Robin, Least Connections, IP Hash (sticky), Weighted Round Robin, Random.
- ✦ Health check: tự động loại bỏ instance không healthy khỏi rotation.
- ✦ Cloud: AWS ALB (L7), NLB (L4), GCP Load Balancer. K8s: Service (kube-proxy) + Ingress (L7).

*Nginx L7 upstream: least_conn + weighted + backup server + L7 path routing; K8s Ingress*
```java
# Nginx L7 load balancer for order-service (upstream config)
upstream order_service {
    least_conn;                                  # least-connections algorithm
    server order-service-1:8080 weight=3;        # 3x more traffic than weight=1
    server order-service-2:8080 weight=3;
    server order-service-3:8080 weight=1;        # lower-spec instance
    server order-service-dr:8080 backup;         # only used if all above fail
    keepalive 32;                                # persist connections to upstream
}

server {
    listen 443 ssl;
    server_name api.example.com;

    location /api/orders/ {
        proxy_pass         http://order_service;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header   Host             $host;
        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;

        # Health check: remove from pool after 3 failures, add back after 2 passes
        # (nginx plus feature; OSS uses passive health check)
    }

    # L7 routing: different services by path prefix
    location /api/payments/ {
        proxy_pass http://payment_service;
    }
    location /api/users/ {
        proxy_pass http://user_service;
    }
}

# Kubernetes Ingress (L7) — preferred in K8s environments
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   name: api-ingress
#   annotations:
#     nginx.ingress.kubernetes.io/upstream-hash-by: "$http_x_user_id"  # sticky by user
# spec:
#   rules:
#   - http:
#       paths:
#       - path: /api/orders
#         backend: { service: { name: order-service, port: { number: 8080 } } }
#       - path: /api/payments
#         backend: { service: { name: payment-service, port: { number: 8080 } } }
```

### 💡 Lời khuyên thực tế

Với microservice trong K8s: dùng Ingress (Nginx, Traefik) cho external traffic, K8s Service cho internal. Với multi-region: dùng global load balancer (AWS Route53 + ALB) với geolocation routing và health-based failover.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa L4 và L7 load balancing là gì?</b></summary>

L4 hoạt động ở tầng Transport (TCP/UDP), phân phối traffic chỉ dựa trên IP và Port (tốc độ siêu nhanh). L7 hoạt động ở tầng Application (HTTP/HTTPS), có thể đọc header, cookie, url path để đưa ra quyết định routing thông minh.
</details>

<details>
<summary><b>Q: Sticky session là gì và khi nào bạn dùng nó?</b></summary>

Là kỹ thuật cấu hình Load Balancer luôn định tuyến các request từ một Client cụ thể đến duy nhất một server vật lý trong suốt phiên làm việc. Dùng khi ứng dụng lưu trữ session trực tiếp trong bộ nhớ cục bộ của server đó.
</details>

<details>
<summary><b>Q: Load balancer phát hiện và loại bỏ instance không healthy thế nào?</b></summary>

Thông qua cơ chế **Health Check**: định kỳ gửi các request thử nghiệm (ví dụ gọi API `/actuator/health` qua HTTP). Nếu instance không phản hồi hoặc trả về mã lỗi liên tiếp vượt quá số lần cấu hình, Load Balancer sẽ ngừng chuyển tiếp traffic đến nó.
</details>
