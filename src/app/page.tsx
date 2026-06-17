import React from "react";
import Link from "next/link";
import { RedeemCodeHomeInput } from "@/components/common/RedeemCodeHomeInput";

export default function Home() {
  return (
    <div style={{ minHeight: "100%" }}>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <span className="hero-badge">Học Tiếng Anh Hiệu Quả</span>
          <h1 className="hero-title">
            Chinh phục tiếng Anh chuyên nghiệp cùng <span>English with Ms.Jan</span>
          </h1>
          <p className="hero-subtitle">
            Các khóa học tinh gọn, tập trung vào tiếng Anh giao tiếp thực tế và văn phòng dành riêng cho người đi làm và sinh viên đại học.
          </p>
          
          <RedeemCodeHomeInput />

          <div className="hero-actions" style={{ marginTop: "32px" }}>
            <Link href="/courses" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: "1.05rem" }}>
              Xem các khóa học
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "4px" }}
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link href="#learning-methods" className="btn btn-secondary" style={{ padding: "14px 28px", fontSize: "1.05rem" }}>
              Phương pháp học
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="learning-methods" style={{ padding: "80px 0", background: "rgba(var(--foreground-rgb), 0.02)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "16px", letterSpacing: "-0.5px" }}>
              Phương pháp giảng dạy đột phá
            </h2>
            <p style={{ color: "rgb(var(--secondary-rgb))", maxWidth: "600px", margin: "0 auto", fontSize: "1.1rem" }}>
              Chúng tôi cung cấp lộ trình học tập tối ưu, kết hợp lý thuyết tinh gọn và thực hành tương tác trực quan.
            </p>
          </div>

          <div className="grid">
            {/* Feature 1 */}
            <div className="card">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgb(var(--primary-light-rgb))",
                  color: "rgb(var(--primary-rgb))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "12px" }}>Video Bài Giảng Thực Tế</h3>
              <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem" }}>
                Học qua các tình huống giao tiếp văn phòng thực tế, viết email chuyên nghiệp và thuyết trình tự tin trước đối tác.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgb(var(--accent-light-rgb))",
                  color: "rgb(var(--accent-rgb))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 12 2 2 4-4" />
                  <path d="M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M20 12h2" />
                  <path d="M2 12h2" />
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "12px" }}>Luyện Tập Tương Tác</h3>
              <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem" }}>
                Làm các bài tập trắc nghiệm, điền từ vào chỗ trống và nhận kết quả tức thì để củng cố ngữ pháp và cấu trúc câu ngay lập tức.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgb(var(--primary-light-rgb))",
                  color: "rgb(var(--primary-rgb))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "12px" }}>Tài Nguyên Mọi Lúc Mọi Nơi</h3>
              <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem" }}>
                Tải xuống tài liệu PDF độc quyền, file nghe MP3 chất lượng cao để ôn tập thuận tiện ngay trên điện thoại hoặc máy tính.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: "80px 0", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <div
            style={{
              padding: "50px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0.05) 100%)",
              border: "1px solid rgb(var(--card-border-rgb))",
            }}
          >
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px", letterSpacing: "-0.5px" }}>
              Bắt đầu hành trình nâng tầm tiếng Anh của bạn
            </h2>
            <p style={{ color: "rgb(var(--secondary-rgb))", marginBottom: "30px", fontSize: "1.05rem" }}>
              Đăng nhập bằng tài khoản Google để lưu trữ tiến độ học tập và mở khóa toàn bộ bài học miễn phí.
            </p>
            <Link href="/courses" className="btn btn-primary" style={{ padding: "12px 24px" }}>
              Bắt đầu học ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
