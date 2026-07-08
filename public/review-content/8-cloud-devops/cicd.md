# CI/CD

**Breadcrumb:** 8. Cloud & DevOps

> CI/CD tự động hóa build, test và deploy code change — Continuous Integration merge và test thường xuyên; Continuous Delivery/Deployment tự động hóa con đường đến production.

## Các điểm chính

- ✦ **CI**: mỗi commit trigger build + unit test + integration test. Feedback nhanh (< 10 phút).
- ✦ **CD (Delivery)**: artifact sẵn sàng deploy sau khi pass CI. Cổng thủ công trước prod.
- ✦ **CD (Deployment)**: tự động deploy lên prod khi CI green. Cần độ tin tưởng test cao.
- ✦ Tool: GitHub Actions, Jenkins, GitLab CI, CircleCI, ArgoCD (GitOps).
- ✦ GitOps: desired state declarative trong Git, ArgoCD reconcile cluster state liên tục.

*GitHub Actions CI/CD pipeline*
```java
# GitHub Actions CI/CD pipeline
name: CI/CD
on: [push, pull_request]
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with: {java-version: '21', distribution: 'temurin'}
    - uses: actions/cache@v4
      with: {path: ~/.m2, key: "${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}"}
    - run: mvn verify  # compile + test + integration test
    - run: mvn package -DskipTests
    - name: Build & push Docker image
      run: |
        docker build -t myrepo/app:${{ github.sha }} .
        docker push myrepo/app:${{ github.sha }}
  deploy:
    needs: test-and-build
    if: github.ref == 'refs/heads/main'
    run: kubectl set image deployment/app app=myrepo/app:${{ github.sha }}
```

### 💡 Lời khuyên thực tế

Giữ CI dưới 10 phút — developer sẽ không chờ pipeline chậm và bắt đầu bỏ qua. Chạy unit test song song, integration test với TestContainers (không có external dependency). Dùng ArgoCD cho GitOps-based deployment lên K8s.

### ❓ Câu hỏi phỏng vấn

<details>
<summary><b>Q: Sự khác biệt giữa CI, CD (Delivery) và CD (Deployment) là gì?</b></summary>

CI (Continuous Integration): Tự động build và test mỗi khi push code. Continuous Delivery: Tự động chuẩn bị bản phát hành sẵn sàng nhưng cần con người click duyệt để deploy lên prod. Continuous Deployment: Tự động hoàn toàn luồng đẩy bản build thẳng lên prod mà không cần can thiệp thủ công.
</details>

<details>
<summary><b>Q: Làm thế nào để đảm bảo CI pipeline vẫn nhanh khi codebase tăng trưởng?</b></summary>

Tận dụng cache (dependencies, docker layers), chạy các bước test song song (parallel testing), và áp dụng cơ chế build/test phân tách chỉ chạy trên những file có sự thay đổi (incremental builds).
</details>

<details>
<summary><b>Q: GitOps là gì và ArgoCD implement nó thế nào?</b></summary>

Là phương pháp quản lý hạ tầng lấy Git làm "nguồn sự thật duy nhất" (Single Source of Truth). ArgoCD liên tục giám sát Git repository chứa cấu hình Kubernetes và so sánh với trạng thái thực tế trên cluster; nếu phát hiện sai lệch (drift), nó sẽ tự động đồng bộ hoá (sync) cluster về đúng cấu hình trên Git.
</details>
