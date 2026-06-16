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
- **Quy tắc 1.5**: **Phân tách mã nguồn theo 3 lớp kiến trúc Separation of Concerns (SoC)**:
  - **Lớp 1: UI / Presentation Layer** (`src/app/`, `src/components/`): Chỉ chịu trách nhiệm kết xuất giao diện, liên kết class từ CSS Modules và bắt các sự kiện (onClick, onChange) để chuyển sang Lớp 2. Tuyệt đối không chứa logic Firebase hoặc Web API trực tiếp.
  - **Lớp 2: Custom Hooks Layer** (`src/hooks/`): Đóng gói React state, quản lý luồng sự kiện và gọi API của các đối tượng trình duyệt (SpeechRecognition, Audio). Tác vụ xử lý state cục bộ của micro phải nằm ở cấp component nhỏ nhất để tránh re-render toàn bộ trang chính.
  - **Lớp 3: Services Layer** (`src/services/`): Chứa các hàm JavaScript/TypeScript thuần túy (async/sync functions) thực hiện gọi dữ liệu Firebase Storage, Firestore hoặc API ngoài. Hoàn toàn cách ly khỏi React hooks/state để dễ dàng kiểm thử độc lập.

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
- **Quy tắc 2.5**: **Sử dụng CSS Modules cho style đặc thù & Cấm viết inline styles**:
  - Cấm sử dụng thuộc tính `style={{ ... }}` bên trong tệp React TSX để viết CSS thô.
  - Style đặc thù của mỗi trang hoặc component phải được viết riêng trong các tệp CSS Modules (`*.module.css`) và đặt cùng thư mục (co-location) để tận dụng cơ chế cô lập phạm vi (Scoped class) của Next.js, tránh xung đột tên CSS và tối ưu hóa tốc độ tải trang (CSS code-splitting).
  - **[globals.css](file:///c:/doan/english-with-jan/src/app/globals.css)** chỉ dành riêng cho việc lưu trữ Design Tokens (CSS Variables) và các CSS layout tiện ích dùng chung (như `.container`, `.btn`).
  - Khi sử dụng các thuộc tính CSS có tiền tố trình duyệt (ví dụ `-webkit-background-clip`), bắt buộc phải khai báo song song thuộc tính CSS chuẩn (`background-clip`) ngay bên cạnh để đảm bảo tính tương thích và vượt qua kiểm định của Stylelint.

---

## 3. Tích Hợp Firebase & Quản Lý Trạng Thái (State Management)

- **Quy tắc 3.1**: **Không khởi tạo Firebase SDK nhiều lần**. Chỉ khởi tạo một instance duy nhất (Singleton Pattern) tại [config.ts](file:///c:/doan/english-with-jan/src/lib/firebase/config.ts) và export trực tiếp các instance `auth`, `db` (Firestore), và `storage` để sử dụng.
- **Quy tắc 3.2**: Tất cả API Keys của Firebase phải lưu tại file [.env.local](file:///c:/doan/english-with-jan/.env.local) có tiền tố `NEXT_PUBLIC_` và **không bao giờ được commit lên git**.
- **Quy tắc 3.3**: Quản lý phiên đăng nhập (Authentication) bằng `AuthProvider` từ [AuthContext.tsx](file:///c:/doan/english-with-jan/src/context/AuthContext.tsx) bọc tại Layout gốc. Các Client Component lấy thông tin người dùng thông qua Custom Hook `useAuth()`.
- **Quy tắc 3.4**: Phân chia rõ ràng mã nguồn:
  - **Server Components**: Mặc định cho toàn bộ trang để tối ưu SEO và tốc độ tải trang.
  - **Client Components**: Chỉ gắn `"use client"` cho những component cần sự tương tác (form, nút bấm, gọi hooks của React hoặc Firebase client SDK).
- **Quy tắc 3.5**: **Phân định rõ ràng Client State và Server State**:
  - **Server State / Database Cache**: Toàn bộ dữ liệu đồng bộ từ Firebase (Storage, Firestore) phải được quản lý thông qua **TanStack Query (React Query)** bằng `useQuery` và `useMutation`. Tuyệt đối không tự tạo các state `loading`, `error` thủ công hoặc dùng `useEffect` gọi fetch dữ liệu trực tiếp lúc mount component.
  - **Client/UI State**: Sử dụng **Zustand** cho các kho lưu trữ toàn cục của ứng dụng (UI drawers, theme settings, local cache) để tránh boilerplate của Redux và tối ưu re-render tốt hơn React Context.
- **Quy tắc 3.6**: **Tránh lỗi Cascading Renders và set-state-in-effect**:
  - Cấm gọi `setState` đồng bộ trực tiếp bên trong `useEffect` khi phản hồi thay đổi prop (dễ kích hoạt lỗi Eslint `react-hooks/set-state-in-effect`). Thay vào đó, hãy sử dụng **Derived State** (Trạng thái phái sinh) được tính toán đồng bộ ngay trong quá trình render.
  - Để reset trạng thái cục bộ của một form chỉnh sửa hoặc panel chi tiết khi dữ liệu đầu vào thay đổi, hãy áp dụng giải pháp React chuẩn: truyền thuộc tính `key={uniqueId}` (ví dụ `key={selectedSound.ipa}`) cho component con để React tự động unmount và mount lại, làm sạch state mà không cần dùng `useEffect`.

---

## 4. Quy Chuẩn Chất Lượng Code & Kiểm Tra (Quality & Validation)

- **Quy tắc 4.1**: **Giới hạn độ dài tệp tin nguồn**: Mỗi tệp tin mã nguồn phát triển tính năng (như `.ts`, `.tsx`, `.js`, `.css`) **không được vượt quá 500 dòng code**. Điều này giúp mã nguồn được mô-đun hóa hợp lý, dễ đọc, dễ kiểm thử và bảo trì lâu dài. Quy tắc này ngoại trừ các tệp dữ liệu tĩnh JSON và tệp cấu hình hệ thống.
- **Quy tắc 4.2**: Trước khi thực hiện lệnh build dự án hoặc trước khi commit mã nguồn lên Git, bắt buộc phải chạy lệnh kiểm định toàn diện để đảm bảo không có lỗi:
  - **Lệnh kiểm tra định dạng và quy tắc code (Linting JS/TS)**:
    ```bash
    eslint .
    ```
  - **Lệnh kiểm tra và định dạng CSS (Stylelint CSS)**:
    ```bash
    npm run lint:css
    ```
  - **Lệnh kiểm tra kiểu dữ liệu (TypeScript Type Check)**:
    ```bash
    npm run type-check
    ```
  - **Lệnh xác thực toàn diện (Validate)**:
    ```bash
    npm run validate
    ```
    *(Lệnh validate này sẽ tự động chạy cả `lint:js`, `lint:css` và `type-check`. Mã nguồn chỉ được coi là đạt tiêu chuẩn khi lệnh này kết thúc thành công không có lỗi).*

---

*Tài liệu này được cập nhật vào tháng 06/2026 cho dự án English with Jan.*
