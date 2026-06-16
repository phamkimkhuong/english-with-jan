"use client";

import React from "react";
import { staticCourses } from "@/types/course";

export default function AdminCoursesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Quản lý Chương trình học ({staticCourses.length})
        </h2>
      </div>

      {/* Grid Khóa học */}
      <div className="grid">
        {staticCourses.map((course) => (
          <div key={course.id} className="card">
            <div
              style={{
                height: "8px",
                background: course.color.startsWith("var") ? `rgb(${course.color})` : course.color,
                borderRadius: "4px",
                marginBottom: "20px",
              }}
            />
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: course.color.startsWith("var") ? `rgb(${course.color})` : course.color,
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
          </div>
        ))}
      </div>
    </div>
  );
}
