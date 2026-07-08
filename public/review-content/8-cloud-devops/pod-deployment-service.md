# Pod, Deployment & Service

**Breadcrumb:** 8. Cloud & DevOps › Kubernetes

> Pod là đơn vị deployable nhỏ nhất; Deployment quản lý Pod replica theo declarative; Service cung cấp truy cập network ổn định đến Pod bất kể IP động của chúng.

## Các điểm chính

- ✦ **Pod**: một hoặc nhiều container chia sẻ network namespace và volume. Ephemeral — được tái tạo khi thất bại.
- ✦ **Deployment**: desired-state controller cho Pod. Xử lý replica count, rolling update, rollback.
- ✦ **Loại Service**: ClusterIP (chỉ internal), NodePort (external qua node port), LoadBalancer (cloud LB), ExternalName.
- ✦ Service dùng label selector để tìm Pod mục tiêu — decoupled khỏi Pod IP address.
- ✦ <code>kubectl rollout status deployment/name</code>: monitor rolling update. <code>kubectl rollout undo</code>: rollback.

*Cấu hình Service và Ingress*
```java
# Service: stable endpoint for the deployment
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service  # matches deployment pods
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP       # internal only

# External access via Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /orders
        pathType: Prefix
        backend:
          service: {name: order-service, port: {number: 80}}
```

### 💡 Lời khuyên thực tế

Luôn dùng Deployment, đừng bao giờ tạo Pod trực tiếp — Deployment xử lý self-healing, rolling update và desired-state reconciliation. Dùng ClusterIP cho internal service; chỉ expose bên ngoài qua Ingress với TLS.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa ClusterIP và LoadBalancer service là gì?</b></summary>

ClusterIP chỉ cấp một địa chỉ IP nội bộ bên trong K8s cluster để các pod gọi nhau. LoadBalancer sẽ tích hợp với hạ tầng cloud để cấp một địa chỉ IP Public thực tế hướng ra ngoài Internet cho người dùng truy cập.
</details>

<details>
<summary><b>Q: Kubernetes Service khám phá Pod nào để route đến thế nào?</b></summary>

Dựa trên cấu hình Label Selector trong file manifest của Service để tự động lọc và gom tất cả các Pod có nhãn (Labels) tương ứng vào danh sách Endpoint IPs.
</details>

<details>
<summary><b>Q: Điều gì xảy ra trong khi Kubernetes rolling update?</b></summary>

Kubernetes tạo mới pod phiên bản mới, kiểm tra trạng thái hoạt động; khi pod mới sẵn sàng nhận tải, K8s đưa pod mới vào Service Endpoint và tiến hành xoá pod phiên bản cũ một cách tuần tự từ từ.
</details>
