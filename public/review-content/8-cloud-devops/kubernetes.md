# Kubernetes

**Breadcrumb:** 8. Cloud & DevOps

> Kubernetes orchestrate containerized workload — schedule Pod lên Node, quản lý scaling và self-healing, cung cấp service discovery, config management và rolling deployment.

## Các điểm chính

- ✦ Core object: **Pod** (1+ container), **Deployment** (quản lý replica), **Service** (stable network endpoint), **ConfigMap/Secret**.
- ✦ Control plane: API Server, Scheduler, Controller Manager, etcd.
- ✦ Node: Kubelet (chạy pod), Kube-proxy (networking), container runtime.
- ✦ Self-healing: restart pod thất bại, reschedule trên node chết, kill pod không pass health check.
- ✦ kubectl: CLI tool chính. <code>kubectl get pods</code>, <code>describe</code>, <code>logs</code>, <code>exec</code>, <code>apply -f</code>.

*K8s Deployment: topologySpreadConstraints, envFrom ConfigMap+Secret, liveness vs readiness probe, Prometheus annotations, resource requests/limits*
```java
# ── order-service Kubernetes Deployment (production-grade) ──
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: ecommerce
  labels: {app: order-service, version: v1.2.3}
spec:
  replicas: 3
  selector:
    matchLabels: {app: order-service}
  template:
    metadata:
      labels: {app: order-service, version: v1.2.3}
      annotations:
        prometheus.io/scrape: "true"         # Prometheus auto-discovers this pod
        prometheus.io/path: "/actuator/prometheus"
        prometheus.io/port:  "8080"
    spec:
      # Spread replicas across nodes — single node failure → still 2 replicas up
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels: {app: order-service}

      containers:
      - name: order-service
        image: myrepo/order-service:v1.2.3   # always use exact SHA or semver tag
        ports: [{containerPort: 8080}]
        envFrom:
        - configMapRef: {name: order-service-config}  # non-sensitive config
        - secretRef:    {name: order-service-secrets}  # DB password, JWT secret

        resources:
          requests: {cpu: "250m", memory: "512Mi"}   # Scheduler uses this for placement
          limits:   {cpu: "500m", memory: "1Gi"}     # OOM kill threshold

        # livenessProbe: restart container if JVM is hung/deadlocked
        livenessProbe:
          httpGet: {path: /actuator/health/liveness, port: 8080}
          initialDelaySeconds: 45    # allow JVM + Spring context warmup
          periodSeconds: 10
          failureThreshold: 3

        # readinessProbe: remove pod from Service endpoints if not ready
        # (e.g., DB connection pool exhausted, downstream dependency down)
        readinessProbe:
          httpGet: {path: /actuator/health/readiness, port: 8080}
          initialDelaySeconds: 30
          periodSeconds: 5
          failureThreshold: 3
```

### 💡 Lời khuyên thực tế

Luôn đặt resource `requests` và `limits` — nếu không, HPA không thể tính utilization và pod có thể được schedule trên node quá tải. Map Spring Boot Actuator health endpoint với liveness/readiness probe.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa liveness probe và readiness probe là gì?</b></summary>

Liveness Probe kiểm tra xem pod còn sống không; nếu fail, K8s sẽ tự động restart pod. Readiness Probe kiểm tra xem pod đã sẵn sàng nhận traffic chưa; nếu fail, K8s tạm thời ngắt pod ra khỏi Service Load Balancer để tránh gửi request của user vào.
</details>

<details>
<summary><b>Q: Kubernetes schedule pod lên node thế nào?</b></summary>

Kube-scheduler lọc các node dựa trên các điều kiện tài nguyên tối thiểu (Predicates) như CPU/RAM, sau đó đánh giá chấm điểm các node phù hợp (Priorities) dựa trên luật (Affinity, Taints, Tolerations) để chọn node tối ưu nhất để đặt pod lên.
</details>

<details>
<summary><b>Q: Điều gì xảy ra khi node đang chạy pod bị hỏng?</b></summary>

Kube-controller-manager phát hiện node mất kết nối với control plane qua heartbeat. Sau khoảng thời gian timeout (thường là 5 phút), các pod trên node hỏng đó sẽ bị đánh dấu trục xuất và tự động được lập lịch tạo mới lại trên các node khoẻ mạnh khác.
</details>
