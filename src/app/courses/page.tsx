import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { staticCourses } from "@/types/course";

export const metadata: Metadata = {
  title: "Khóa Học Tiếng Anh Giao Tiếp & Luyện Thi | English with Ms.Jan",
  description: "Tổng hợp các khóa học tiếng Anh thực chiến cho người đi làm và sinh viên. Học phát âm giao tiếp văn phòng, ngữ pháp thực hành tinh gọn hiệu quả.",
  keywords: ["Khóa học tiếng Anh", "Tiếng Anh giao tiếp", "Tiếng Anh văn phòng", "Học tiếng Anh thực chiến", "English with Ms. Jan Courses"],
};

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
          {staticCourses.map((course) => (
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
