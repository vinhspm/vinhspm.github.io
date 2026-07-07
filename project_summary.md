# Tổng quan Dự án: Portfolio Cá nhân

## Thông tin chung
- **Tên dự án:** profile
- **Chủ sở hữu:** Kiều Thế Vinh (Software Engineer)
- **Công nghệ chính:** 
  - Frontend Framework: React 19
  - Build Tool: Vite
  - Routing: React Router DOM
  - Animation: Motion (Framer Motion)
  - Icons: Lucide React
  - Styling: Vanilla CSS

## Cấu trúc Dự án
Dự án được cấu trúc theo chuẩn của một ứng dụng React/Vite cơ bản:
- `src/App.jsx`: Component gốc, chứa cấu hình routing và layout chính bao gồm `Navbar`, `Footer`.
- `src/pages/`: Chứa các trang chính của ứng dụng.
  - `Home.jsx`: Trang chủ, hiển thị thông tin giới thiệu, kinh nghiệm làm việc và các dự án.
  - `Review.jsx`: Trang review (hiện có trên thanh điều hướng).
- `src/index.css` & `src/App.css`: Các file CSS toàn cục.

## Nội dung & Tính năng chính
Dự án tập trung vào việc thể hiện hồ sơ năng lực (Portfolio) của một kỹ sư phần mềm. Trang chủ (`Home.jsx`) bao gồm các phần:
1. **Hero Section:** 
   - Sử dụng hiệu ứng gõ chữ (Typewriter effect) trong một giao diện giả lập Terminal để giới thiệu bản thân một cách độc đáo.
   - Hiển thị tóm tắt ngắn gọn: *"Software engineer with experience building scalable backend systems, optimizing database interactions, and developing robust web applications."*
2. **Kinh nghiệm làm việc (Experience):** 
   - **CMC Global** (03/2025 - Hiện tại): Software Engineer (C#, .NET Core, AWS, Jenkins, Docker, SQL Server).
   - **FPT Software** (02/2024 - 02/2025): Software Engineer (C#, AWS, CI/CD).
   - **Misa JSC** (04/2022 - 02/2024): Full-stack Developer (JavaScript, Vue/Angular, .NET).
3. **Dự án tiêu biểu (Projects):**
   - Learning Management System (.Net 8, Redis, SQL Server)
   - Sysmex Calibration Tool (.Net Core, PostgreSQL, Angular)
   - Amis Task Management System (.Net Core, MySQL, Angular 10)
4. **Thông tin liên hệ (Contact):**
   - Email: vinhkieu.uet@gmail.com
   - LinkedIn: in/vinhkieu
   - GitHub: vinhspm

## Đánh giá
Đây là một trang web portfolio hiện đại, sử dụng tốt các animation để tăng tính tương tác (Framer Motion), có thiết kế Dark/Glassmorphism (có thể thấy qua cấu trúc className như `glass-panel`, `terminal-window`). Mã nguồn được tổ chức sạch sẽ, dễ bảo trì.
