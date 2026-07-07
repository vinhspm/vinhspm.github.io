# HPA & Rolling Update

**Breadcrumb:** 8. Cloud & DevOps › Kubernetes

> HPA (Horizontal Pod Autoscaler) tự động scale Deployment replica dựa trên metric; Rolling Update thay thế pod dần dần để đạt zero-downtime deployment.

## Các điểm chính

- ✦ **HPA**: theo dõi metric (CPU, memory, custom), scale replica trong bounds min/max.
- ✦ HPA cần resource <code>requests</code> được đặt trên container để tính utilization.
- ✦ **Rolling Update**: Kubernetes thay thế pod cũ bằng mới dần dần. <code>maxSurge</code>: pod thêm trong khi update. <code>maxUnavailable</code>: pod có thể không available.
- ✦ Readiness probe gate: pod mới chỉ nhận traffic sau khi pass readiness check.
- ✦ <code>PodDisruptionBudget</code>: đảm bảo số lượng pod tối thiểu luôn available trong khi node maintenance.

*Cấu hình HPA và zero-downtime rolling update*
```java
# HPA with CPU and custom metric
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: order-service-hpa}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: order-service}
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 70}

# Rolling update strategy in Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # allow 1 extra pod during update
      maxUnavailable: 0  # never reduce below desired count (zero-downtime)
```

### 💡 Lời khuyên thực tế

Đặt `maxUnavailable: 0` cho zero-downtime deployment. Đặt `minReplicas: 2` để luôn có ít nhất một pod available trong rolling update. Kết hợp với PodDisruptionBudget cho node drain operation.

### ❓ Câu hỏi phỏng vấn

- **Q:** Kubernetes đảm bảo zero downtime trong rolling update thế nào?
- **Q:** HPA có thể dùng metric nào ngoài CPU và memory?
- **Q:** PodDisruptionBudget là gì và khi nào bạn cần?
