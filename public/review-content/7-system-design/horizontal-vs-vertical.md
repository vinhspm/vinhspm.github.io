# Horizontal vs Vertical Scaling

**Breadcrumb:** 7. System Design › Scalability

> Vertical scaling nâng cấp tài nguyên một máy; horizontal scaling thêm nhiều máy — kiến trúc cloud hiện đại ưu tiên horizontal cho resilience và scale không giới hạn.

## Các điểm chính

- ✦ Vertical: dễ implement (không thay đổi code), bị giới hạn bởi phần cứng, single point of failure, đắt.
- ✦ Horizontal: cần load balancer + thiết kế stateless, scale vô hạn trên lý thuyết, fault tolerance tốt hơn.
- ✦ Auto-scaling: cloud (AWS ASG, K8s HPA) scale out trên CPU/memory/custom metric, scale in khi tải thấp.
- ✦ Database: vertical scaling phổ biến (loại instance RDS); horizontal = read replica hoặc sharding.
- ✦ Quy tắc ngón tay cái: scale vertically cho đến khi đau, sau đó scale horizontally.

*K8s HPA: CPU + Kafka lag metrics; VPA cho vertical; decision guide vertical vs horizontal*
```java
# Kubernetes HPA: horizontal auto-scaling for order-service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2      # always 2+ for HA (no single point of failure)
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70   # scale out when avg CPU > 70%
  - type: External
    external:
      metric:
        name: kafka_consumer_lag  # scale based on Kafka consumer lag
        selector:
          matchLabels:
            topic: order-events
      target:
        type: AverageValue
        averageValue: "1000"      # scale out when lag > 1000 messages per pod

# Vertical scaling via VPA (Vertical Pod Autoscaler) — adjust CPU/memory limits
# Use when: single-threaded workload, stateful (can't easily add more pods),
# or during initial sizing before HPA tuning
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: order-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  updatePolicy:
    updateMode: "Off"   # Recommendation only — apply manually to avoid restarts

# Decision guide:
# Start vertical (increase pod resources) → cheaper, zero-code change
# Hit vertical limit OR need HA → go horizontal (add replicas)
# DB bottleneck → read replica first, then sharding (sharding = last resort)
# I/O-bound service: HPA on request rate or queue depth, not CPU
```

### 💡 Lời khuyên thực tế

Luôn đặt `minReplicas: 2` cho HA. Scale trên metric cụ thể ứng dụng (Kafka lag, queue depth) không chỉ CPU — CPU thường không phải bottleneck cho I/O-bound service. Đặt resource request/limit để tính toán HPA chính xác.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Khi nào vertical scaling không còn hiệu quả?</b></summary>

Khi chi phí phần cứng tăng theo cấp số nhân nhưng hiệu năng tăng không đáng kể (quy luật hiệu suất giảm dần), hoặc khi đạt giới hạn vật lý tối đa của CPU/RAM mà nhà cung cấp có thể sản xuất.
</details>

<details>
<summary><b>Q: Service cần gì để hỗ trợ horizontal scaling?</b></summary>

Phải thiết kế hoàn toàn **Stateless**: không lưu trạng thái phiên làm việc (session, file cục bộ) trong bộ nhớ của instance để request của người dùng có thể gửi đến bất kỳ node nào vẫn chạy đúng.
</details>

<details>
<summary><b>Q: Kubernetes HPA quyết định khi nào scale thế nào?</b></summary>

HPA định kỳ kiểm tra các metric của Pod (như phần trăm CPU, Memory hoặc custom metric qua Prometheus). Nó tính toán số lượng Pod cần thiết theo công thức: `DesiredReplicas = CurrentReplicas * (CurrentMetricValue / TargetMetricValue)`.
</details>
