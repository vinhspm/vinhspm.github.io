# Blue-Green & Canary Deployment

**Breadcrumb:** 8. Cloud & DevOps › CI/CD

> Blue-Green chạy hai môi trường giống nhau và chuyển traffic ngay lập tức; Canary dần dần chuyển tỷ lệ phần trăm traffic sang phiên bản mới — cả hai cho zero-downtime deployment với rollback dễ dàng.

## Các điểm chính

- ✦ **Blue-Green**: hai môi trường (blue=live, green=mới). Sau khi test, chuyển LB sang green. Instant rollback: chuyển lại blue. Cần 2× tài nguyên.
- ✦ **Canary**: route X% traffic sang phiên bản mới. Tăng tỷ lệ khi độ tin tưởng tăng. Rollback bằng cách route 0% sang canary. Hiệu quả tài nguyên.
- ✦ Canary vs feature flag: canary là infrastructure-level (tất cả user trong tỷ lệ đó). Feature flag là code-level (user cụ thể).
- ✦ Kubernetes: Argo Rollouts hoặc Flux Flagger cho automated canary với metrics-based promotion.

*Blue-Green K8s manifest + Argo Rollouts canary với Prometheus analysis*
```java
# ── Blue-Green: 2 Deployments, switch Service selector ──────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-blue   # currently live
  labels: { app: order-service, slot: blue }
spec:
  replicas: 5
  selector: { matchLabels: { app: order-service, slot: blue } }
  template:
    metadata: { labels: { app: order-service, slot: blue } }
    spec:
      containers:
        - name: app
          image: registry/order-service:v1.9   # old version keeps running
---
# Switch traffic: patch Service selector to "green" after health check
# kubectl patch svc order-service -p '{"spec":{"selector":{"slot":"green"}}}'

# ── Canary: Argo Rollouts với automated Prometheus analysis ─────────────────
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 10
  selector: { matchLabels: { app: order-service } }
  template:
    spec:
      containers:
        - name: app
          image: registry/order-service:v2.0   # new version
  strategy:
    canary:
      canaryService: order-service-canary   # 10% traffic
      stableService: order-service-stable   # 90% traffic
      steps:
        - setWeight: 10
        - pause: { duration: 5m }           # observe metrics
        - analysis:
            templates:
              - templateName: success-rate  # auto-check before promoting
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100                    # full rollout if analysis passes
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.95   # fail if success rate < 95%
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{app="order-service",status!~"5.."}[5m]))
            / sum(rate(http_requests_total{app="order-service"}[5m]))
```

### 💡 Lời khuyên thực tế

Dùng Argo Rollouts cho automated canary với Prometheus-based promotion gate. Định nghĩa tiêu chí thành công (latency p99, error rate) như analysis template — tự động rollback nếu giảm chất lượng. Điều này cho bạn an toàn deployment mà không cần monitor thủ công.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Trade-off chính giữa blue-green và canary deployment là gì?</b></summary>

Blue-Green cần gấp đôi tài nguyên hệ thống (chạy song song 2 môi trường hoàn chỉnh) nhưng rollback lập tức rất an toàn. Canary tiết kiệm tài nguyên hơn và kiểm tra được lỗi trên tập người dùng thực tế nhỏ nhưng quá trình theo dõi lâu và phức tạp hơn.
</details>

<details>
<summary><b>Q: Argo Rollouts tự động hóa quyết định canary promotion thế nào?</b></summary>

Sử dụng cơ chế **AnalysisTemplate** để định kỳ chạy các truy vấn PromQL kiểm tra tỷ lệ lỗi, độ trễ trên Prometheus. Nếu các chỉ số nằm trong ngưỡng an toàn, nó tự động tăng tỷ lệ traffic; nếu phát hiện lỗi, nó tự động rollback.
</details>

<details>
<summary><b>Q: Feature flag là gì và khác canary deployment thế nào?</b></summary>

Canary Deployment là kiểm soát định tuyến traffic ở tầng mạng hạ tầng (gửi 5% user sang bản app mới). Feature Flag hoạt động ở tầng logic ứng dụng (if/else trong code), cho phép bật/tắt tính năng động cho từng đối tượng user cụ thể.
</details>
