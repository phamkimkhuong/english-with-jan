# QUY TẮC PHÁT TRIỂN DỰ ÁN (PROJECT RULES) - ENGLISH WITH JAN

Tài liệu này định nghĩa các quy tắc phát triển phần mềm, chuẩn giao diện (Aesthetics) và kiến trúc hệ thống bắt buộc phải tuân thủ khi làm việc trên dự án **English with Jan**. Các lập trình viên (và các AI coding agent) phải tuyệt đối tuân theo các quy tắc này.

---

## 1. Kiến Trúc Thư Mục & Định Tuyến (Routing)

Dự án sử dụng Next.js **App Router** với cấu trúc thư mục nằm trong `/src`:

- **Quy tắc 1.1**: Toàn bộ trang và API endpoints nằm trong `src/app/`.
  - Chỉ chứa các file đặc biệt của Next.js (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`).
  - **Không** đặt các component dùng chung, hooks, helper functions trực tiếp trong thư mục con của `app/` trừ khi sử dụng thư mục ẩn bắt đầu bằng dấu gạch dưới (Private Folders: `_components`).
- **Quy tắc 1.2**: Không được phép tồn tại đồng thời `page.tsx` và `route.ts` trong cùng một thư mục định tuyến.
- **Quy tắc 1.3**: Gom nhóm các chức năng có cùng cấu trúc layout hoặc mục đích tương tự (như đăng nhập, đăng ký) vào **Route Groups** bằng ngoặc đơn: `app/(auth)/login/page.tsx` để tối ưu hóa tổ chức file mà không đổi URL.
- **Quy tắc 1.4**: Các component dùng chung đặt tại `src/components/`, phân tách rõ:
  - `src/components/common/` (hoặc `ui/`): Button, Card, Input, Modal, v.v.
  - `src/components/layout/`: Navbar, Footer, Sidebar.
  - `src/components/features/`: Các UI component gắn liền với nghiệp vụ của từng tính năng (Ví dụ: `features/course/VideoPlayer.tsx`).

---

## 2. Tiêu Chuẩn Giao Diện & Thiết Kế (UI & CSS)

- **Quy tắc 2.1**: **Không sử dụng Tailwind CSS**. Ngoại trừ trường hợp có yêu cầu đặc biệt rõ ràng từ chủ dự án.
- **Quy tắc 2.2**: Thiết kế phải mang phong cách **Premium & Rich Aesthetics**:
  - Sử dụng hệ thống biến màu sắc HSL/RGB cấu hình sẵn trong [globals.css](file:///c:/doan/english-with-jan/src/app/globals.css).
  - Tích hợp hiệu ứng chuyển động mượt mà (smooth transitions, subtle micro-animations).
  - Sử dụng bo góc lớn (`--border-radius: 12px`), hiệu ứng kính mờ (glassmorphism), và đổ bóng mềm mại (premium shadows).
  - Ưu tiên sử dụng phông chữ thiết lập sẵn (Geist Sans) hoặc các font chữ hiện đại từ Google Fonts.
- **Quy tắc 2.3**: Phát triển giao diện theo cơ chế Responsive (mobile-first hoặc responsive-first) để tối ưu cho cả học viên học trên điện thoại và laptop.
- **Quy tắc 2.4**: **Chỉ sử dụng chế độ sáng (Light Mode)**. Dự án không hỗ trợ và không cấu hình chế độ tối (Dark Mode). Tuyệt đối không viết thêm các thuộc tính CSS sử dụng `@media (prefers-color-scheme: dark)` hoặc các class màu tối để tránh làm rối loạn thiết kế giao diện.

---

## 3. Tích Hợp Firebase & Quản Lý Trạng Thái

- **Quy tắc 3.1**: **Không khởi tạo Firebase SDK nhiều lần**. Chỉ khởi tạo một instance duy nhất (Singleton Pattern) tại [config.ts](file:///c:/doan/english-with-jan/src/lib/firebase/config.ts) và export trực tiếp các instance `auth`, `db` (Firestore), và `storage` để sử dụng.
- **Quy tắc 3.2**: Tất cả API Keys của Firebase phải lưu tại file [.env.local](file:///c:/doan/english-with-jan/.env.local) có tiền tố `NEXT_PUBLIC_` và **không bao giờ được commit lên git**.
- **Quy tắc 3.3**: Quản lý phiên đăng nhập (Authentication) bằng `AuthProvider` từ [AuthContext.tsx](file:///c:/doan/english-with-jan/src/context/AuthContext.tsx) bọc tại Layout gốc. Các Client Component lấy thông tin người dùng thông qua Custom Hook `useAuth()`.
- **Quy tắc 3.4**: Phân chia rõ ràng mã nguồn:
  - **Server Components**: Mặc định cho toàn bộ trang để tối ưu SEO và tốc độ tải trang.
  - **Client Components**: Chỉ gắn `"use client"` cho những component cần sự tương tác (form, nút bấm, gọi hooks của React hoặc Firebase client SDK).

---

## 4. Quy Chuẩn Chất Lượng Code & Kiểm Tra (Quality & Validation)

- **Quy tắc 4.1**: **Giới hạn độ dài tệp tin nguồn**: Mỗi tệp tin mã nguồn phát triển tính năng (như `.ts`, `.tsx`, `.js`, `.css`) **không được vượt quá 500 dòng code**. Điều này giúp mã nguồn được mô-đun hóa hợp lý, dễ đọc, dễ kiểm thử và bảo trì lâu dài. Quy tắc này ngoại trừ các tệp dữ liệu tĩnh JSON và tệp cấu hình hệ thống.
- **Quy tắc 4.2**: Trước khi thực hiện lệnh build dự án hoặc trước khi commit mã nguồn lên Git, bắt buộc phải chạy lệnh kiểm định toàn diện để đảm bảo không có lỗi:

- **Lệnh kiểm tra định dạng và quy tắc code (Linting)**:
  ```bash
  npm run lint
  ```
- **Lệnh kiểm tra kiểu dữ liệu (TypeScript Type Check)**:
  ```bash
  npm run type-check
  ```
- **Lệnh xác thực toàn diện (Validate)**:
  ```bash
  npm run validate
  ```
  *(Lệnh này sẽ tự động chạy cả `lint` và `type-check`. Mã nguồn chỉ được coi là đạt tiêu chuẩn khi lệnh này kết thúc thành công không có lỗi).*

---

*Tài liệu này được biên soạn vào tháng 06/2026 cho dự án English with Jan.*
