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

- **Q:** Sự khác biệt giữa ClusterIP và LoadBalancer service là gì?
- **Q:** Kubernetes Service khám phá Pod nào để route đến thế nào?
- **Q:** Điều gì xảy ra trong khi Kubernetes rolling update?
