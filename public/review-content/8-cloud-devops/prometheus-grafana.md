# Prometheus & Grafana

**Breadcrumb:** 8. Cloud & DevOps › Monitoring

> Prometheus scrape metric từ service theo pull model, lưu trong time-series DB và đánh giá alert rule; Grafana visualize metric trong dashboard.

## Các điểm chính

- ✦ Pull model Prometheus: scrape <code>/actuator/prometheus</code> từ mỗi service instance.
- ✦ PromQL: ngôn ngữ query mạnh. <code>rate(http_requests_total[5m])</code> = request rate mỗi giây.
- ✦ Alertmanager: nhận alert từ Prometheus, route đến PagerDuty/Slack/email.
- ✦ Grafana: kết nối đến Prometheus data source, render dashboard. Shared community dashboard (JVM, Spring Boot).
- ✦ Recording rule: pre-compute PromQL query tốn kém cho dashboard performance.

*Prometheus K8s scraping và alert rule*
```java
# Prometheus scrape config (prometheus.yml)
scrape_configs:
  - job_name: 'spring-boot-services'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      target_label: __metrics_path__

# Alerting rules
groups:
- name: api-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels: {severity: critical}
    annotations:
      summary: "High error rate: {{ $value | humanizePercentage }}"
```

### 💡 Lời khuyên thực tế

Import Grafana dashboard có sẵn (JVM Micrometer dashboard ID 4701, Spring Boot 12900). Thêm custom panel cho business metric (order/phút, payment success rate). Thiết lập PagerDuty integration trong Alertmanager cho critical alert.

### ❓ Câu hỏi phỏng vấn

- **Q:** Prometheus thu thập metric từ service thế nào?
- **Q:** Viết PromQL query để tính error rate trong 5 phút.
- **Q:** Làm thế nào để cấu hình alert trong Prometheus/Alertmanager?
