# Kế hoạch Clone Trang Review V2

## Bối cảnh và Phân tích
Mình đã dùng trình duyệt và truy cập thành công vào `https://nguyen-tri-nhan.github.io/review-v2`. Trang này có cấu trúc **Single Page Application** (đó là lý do các tool check HTML tĩnh báo 404).

**Phân tích Giao diện (UI):**
- Layout chia làm 2 màn hình (Split-Screen):
  - **Sidebar (20-25%):** Có thanh tìm kiếm, danh sách bài học dạng Accordion (chia theo 20 category có icon emoji như Core Java, React, Python...), đếm tổng số bài (khoảng 98 topics).
  - **Content Area (75-80%):** Hiển thị nội dung, có breadcrumb ở trên cùng và hiệu ứng nền matrix mờ (`01010101...`).
- Theme: Dark theme với nền xanh đen (`slate-950`), màu nhấn là xanh lá/teal.

**Phân tích Dữ liệu (Content):**
- Toàn bộ nội dung là các file Markdown (`.md`) được tải động từ repo Github gốc của tác giả (`nguyen-tri-nhan/portfolio/.../review-content`).

---

## User Review Required

Dưới đây là kế hoạch chi tiết để clone 100% trang này vào file `Review.jsx` hiện tại của bạn. Kế hoạch này sẽ thay đổi lớn thư mục `public/` (để chứa các file .md) và thêm vài thư viện.

> [!IMPORTANT]
> Mình sẽ cài đặt thêm các thư viện sau để có thể đọc và render Markdown lên React:
> - `react-markdown`: Render file .md thành HTML.
> - `remark-gfm`: Hỗ trợ table, strikethrough.
> - `react-syntax-highlighter`: Tô màu code block.
>
> Bạn xác nhận đồng ý cho mình cài thư viện và tiến hành chứ?

## Proposed Changes (Các bước triển khai)

### 1. Thu thập dữ liệu (Data Fetching)
- [NEW] Tạo một script `scripts/download-review-content.js`.
- Script này sẽ tự động tải danh sách cấu trúc (`topics.ts`) và hơn 90 file `.md` kiến thức từ source github gốc của trang review.
- Các file `.md` sau khi tải sẽ được lưu vào thư mục `public/review-content/` để ứng dụng có thể fetch dễ dàng ở runtime.

### 2. Xây dựng Giao diện (UI & Layout)
#### [MODIFY] `src/pages/Review.jsx`
- Tạo Layout 2 cột (Sidebar và Main Content).
- Tạo component Sidebar: có Input tìm kiếm, danh sách Accordion để render cây thư mục bài học.
- Tạo component MainContent: Gọi hàm `fetch('/review-content/xyz.md')` mỗi khi bấm vào một bài học, sau đó hiển thị bằng `<ReactMarkdown>`.

#### [MODIFY] `src/pages/Review.css`
- Thêm toàn bộ các class CSS giả lập giao diện Dark Theme.
- Tạo background CSS matrix mờ như bản gốc.
- Các hiệu ứng hover, active cho thẻ bài học.

### 3. Cài đặt Logic React
- Tích hợp tính năng **Search** (Tìm kiếm) ở sidebar để lọc bài học.
- Quản lý State: bài học đang được Active, nội dung Markdown hiện tại đang tải.

## Verification Plan
1. [ ] Cài đặt xong thư viện và chạy script tải content (đảm bảo đủ ~98 file `.md`).
2. [ ] Truy cập trang `http://localhost:<port>/review`.
3. [ ] Click thử vào các bài học trong Sidebar, xác nhận nội dung Markdown hiện ra bên phải đúng cấu trúc, chữ hiển thị sắc nét, code block được tô màu.
4. [ ] Test tính năng tìm kiếm.
