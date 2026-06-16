import React from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  lessonsCount: number;
  duration: string;
  color: string;
}

const dummyCourses: Course[] = [
  {
    id: "office-communication",
    title: "Tiếng Anh Giao Tiếp Văn Phòng Thực Chiến",
    description: "Học các mẫu câu, hội thoại thông dụng trong môi trường văn phòng, viết email, thuyết trình và tham gia các cuộc họp chuyên nghiệp.",
    level: "Trung cấp (Intermediate)",
    lessonsCount: 12,
    duration: "6 tuần",
    color: "var(--primary-rgb)",
  },
  {
    id: "practical-grammar",
    title: "Ngữ Pháp Tiếng Anh Thực Hành Cho Người Đi Làm",
    description: "Hệ thống hóa toàn bộ các cấu trúc ngữ pháp quan trọng nhất trong công việc mà không gây nhàm chán. Tập trung vào thực hành thực tế.",
    level: "Căn bản & Trung cấp",
    lessonsCount: 15,
    duration: "8 tuần",
    color: "var(--accent-rgb)",
  },
  {
    id: "academic-vocabulary",
    title: "Từ Vựng & Phát Âm Căn Bản Cho Sinh Viên",
    description: "Xây dựng nền tảng từ vựng học thuật và giao tiếp thiết yếu cho sinh viên đại học chuẩn bị đi làm hoặc chuẩn bị cho các kỳ thi chuẩn đầu ra.",
    level: "Cơ bản (Beginner)",
    lessonsCount: 10,
    duration: "5 tuần",
    color: "var(--primary-rgb)",
  },
];

export default function CoursesPage() {
  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        <div style={{ marginBottom: "40px" }}>
          <span className="hero-badge">Danh sách khóa học</span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "12px", marginBottom: "16px", letterSpacing: "-1px" }}>
            Khóa học Tiếng Anh dành cho bạn
          </h1>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "1.1rem", maxWidth: "600px" }}>
            Lựa chọn khóa học phù hợp với trình độ của bạn để bắt đầu học tập và theo dõi tiến độ của mình ngay hôm nay.
          </p>
        </div>

        <div className="grid">
          {dummyCourses.map((course) => (
            <div key={course.id} className="card">
              <div
                style={{
                  height: "8px",
                  background: `rgb(${course.color})`,
                  borderRadius: "4px",
                  marginBottom: "20px",
                }}
              />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: `rgb(${course.color})`,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                  display: "inline-block",
                }}
              >
                {course.level}
              </span>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "12px", lineHeight: "1.3" }}>
                {course.title}
              </h3>
              <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem", marginBottom: "20px", flex: 1 }}>
                {course.description}
              </p>
              
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "16px",
                  borderTop: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.85rem",
                  color: "rgb(var(--secondary-rgb))",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  {course.lessonsCount} bài học
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {course.duration}
                </span>
              </div>
              
              <Link
                href={`/courses/${course.id}`}
                className="btn btn-primary"
                style={{ marginTop: "20px", width: "100%" }}
              >
                Vào học ngay
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
