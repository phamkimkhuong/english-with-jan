"use client";

import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  lessonsCount: number;
  duration: string;
  color: string;
}

const defaultCourses: Course[] = [
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

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Cơ bản (Beginner)");
  const [lessonsCount, setLessonsCount] = useState(10);
  const [duration, setDuration] = useState("6 tuần");
  const [color, setColor] = useState("var(--primary-rgb)");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, "courses"));
      const querySnapshot = await getDocs(q);
      const list: Course[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Course);
      });
      // Nếu Firestore trống, nạp dữ liệu mặc định ban đầu để hiển thị đẹp mắt
      if (list.length === 0) {
        setCourses(defaultCourses);
      } else {
        setCourses(list);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách khóa học:", error);
      setCourses(defaultCourses);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setMessage({ text: "Vui lòng nhập đầy đủ Tên và Mô tả khóa học!", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await addDoc(collection(db, "courses"), {
        title,
        description,
        level,
        lessonsCount: Number(lessonsCount),
        duration,
        color,
        createdAt: serverTimestamp(),
      });

      setMessage({ text: "Đã tạo khóa học thành công!", type: "success" });
      setTitle("");
      setDescription("");
      setLevel("Cơ bản (Beginner)");
      setLessonsCount(10);
      setDuration("6 tuần");
      setColor("var(--primary-rgb)");
      setShowAddForm(false);
      fetchCourses();
    } catch (error: unknown) {
      console.error("Lỗi thêm khóa học:", error);
      setMessage({ text: "Lỗi lưu dữ liệu: " + (error instanceof Error ? error.message : "Đã có lỗi xảy ra"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* Page header controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Quản lý Chương trình học ({courses.length})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={{ padding: "10px 20px" }}
        >
          {showAddForm ? "Hủy bỏ" : "Thêm khóa học mới"}
        </button>
      </div>

      {message.text && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "0.9rem",
            backgroundColor: message.type === "success" ? "rgb(var(--accent-light-rgb))" : "rgba(239, 68, 68, 0.1)",
            color: message.type === "success" ? "rgb(var(--accent-rgb))" : "rgb(239, 68, 68)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Form thêm khóa học */}
      {showAddForm && (
        <div className="card" style={{ padding: "24px", animation: "slideDown 0.2s ease" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "16px" }}>Khởi Tạo Khóa Học Mới</h3>
          <form onSubmit={handleCreateCourse} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tên khóa học</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tiếng Anh viết Email chuyên nghiệp"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.95rem",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Mô tả ngắn gọn</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt nội dung chính khóa học sẽ mang lại cho học sinh..."
                rows={3}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.95rem",
                  background: "transparent",
                  color: "inherit",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Trình độ</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.95rem",
                    background: "transparent",
                    color: "inherit",
                  }}
                >
                  <option value="Cơ bản (Beginner)">Cơ bản (Beginner)</option>
                  <option value="Căn bản & Trung cấp">Căn bản & Trung cấp</option>
                  <option value="Trung cấp (Intermediate)">Trung cấp (Intermediate)</option>
                  <option value="Nâng cao (Advanced)">Nâng cao (Advanced)</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Số bài học dự kiến</label>
                <input
                  type="number"
                  value={lessonsCount}
                  onChange={(e) => setLessonsCount(Number(e.target.value))}
                  min={1}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.95rem",
                    background: "transparent",
                    color: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Thời gian học</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ví dụ: 6 tuần"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.95rem",
                    background: "transparent",
                    color: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Màu chủ đề của Card</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.95rem",
                    background: "transparent",
                    color: "inherit",
                  }}
                >
                  <option value="var(--primary-rgb)">Màu Indigo (Mặc định)</option>
                  <option value="var(--accent-rgb)">Màu Emerald (Xanh lá)</option>
                  <option value="var(--secondary-rgb)">Màu Slate (Xám/Xanh)</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "12px 30px", marginTop: "10px" }}>
              {loading ? "Đang lưu..." : "Lưu khóa học"}
            </button>
          </form>
        </div>
      )}

      {/* Grid Khóa học */}
      <div className="grid">
        {courses.map((course) => (
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
