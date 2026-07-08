# ConfigMap & Secret

**Breadcrumb:** 8. Cloud & DevOps › Kubernetes

> ConfigMap lưu cấu hình không nhạy cảm dưới dạng key-value; Secret lưu dữ liệu nhạy cảm (base64-encoded, mã hóa khi lưu) — cả hai có thể mount như env var hoặc volume file.

## Các điểm chính

- ✦ **ConfigMap**: config không nhạy cảm (URL, feature flag, log level). Plaintext trong etcd.
- ✦ **Secret**: dữ liệu nhạy cảm (password, API key, TLS cert). Base64 trong etcd; bật encryption-at-rest.
- ✦ Tùy chọn mount: biến môi trường, volume file hoặc đọc qua K8s API.
- ✦ External Secrets Operator: sync secret từ AWS Secrets Manager, Vault, GCP Secret Manager vào K8s Secret.
- ✦ Không bao giờ commit Secrets YAML với giá trị thật — dùng sealed secret hoặc external secrets operator.

*ConfigMap và Secret mount như env var*
```java
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata: {name: app-config}
data:
  SPRING_PROFILES_ACTIVE: "prod"
  LOG_LEVEL: "INFO"
  APP_FEATURE_FLAG: "true"

# Secret (values must be base64 encoded)
apiVersion: v1
kind: Secret
metadata: {name: app-secrets}
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=  # base64("password123")
  JWT_SECRET: c2VjcmV0a2V5      # base64("secretkey")

# Mount in Deployment
spec:
  containers:
  - envFrom:
    - configMapRef: {name: app-config}
    - secretRef:   {name: app-secrets}
```

### 💡 Lời khuyên thực tế

Dùng External Secrets Operator để sync từ AWS Secrets Manager hoặc HashiCorp Vault — tránh lưu secret trong Git. Rotate secret bằng cách cập nhật source; operator tự động truyền thay đổi đến pod.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa ConfigMap và Secret trong Kubernetes là gì?</b></summary>

ConfigMap dùng để lưu trữ dữ liệu cấu hình thông thường dưới dạng plain text. Secret dùng để lưu trữ dữ liệu nhạy cảm (passwords, tokens, keys) dưới dạng mã hóa Base64 và được lưu trên bộ nhớ tạm (tmpfs) của node để tăng độ an toàn.
</details>

<details>
<summary><b>Q: Làm thế nào để quản lý secret an toàn trong Kubernetes production?</b></summary>

Sử dụng các công cụ quản lý khóa chuyên nghiệp bên ngoài (như HashiCorp Vault, AWS Secrets Manager) kết hợp với các bộ tích hợp như **External Secrets Operator** để tự động đồng bộ secret vào K8s mà không cần commit khóa lên Git.
</details>

<details>
<summary><b>Q: Điều gì xảy ra với pod khi bạn cập nhật ConfigMap mà chúng mount?</b></summary>

Nếu ConfigMap được mount dưới dạng **Volume**, dữ liệu bên trong pod sẽ tự động cập nhật sau một khoảng trễ (không cần restart pod). Nếu ConfigMap được nạp qua **Biến môi trường (env)**, pod sẽ KHÔNG tự động cập nhật cho đến khi nó được khởi động lại (restart/rollout).
</details>
