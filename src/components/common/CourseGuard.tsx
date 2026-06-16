"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { redeemAccessCode } from "@/services/accessCodeService";
import { toast } from "@/hooks/useToastStore";

interface CourseGuardProps {
  courseId: string;
  courseTitle?: string;
  children: React.ReactNode;
}

export const LockedCourseView: React.FC<{ 
  courseId: string; 
  courseTitle?: string;
  isExpired?: boolean;
  expiryDate?: Date;
}> = ({
  courseTitle = "Khóa học này",
  isExpired = false,
  expiryDate,
}) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để thực hiện kích hoạt khóa học.");
      return;
    }
    if (!code.trim()) {
      toast.error("Vui lòng nhập mã kích hoạt.");
      return;
    }

    setLoading(true);
    try {
      await redeemAccessCode(user.uid, code.trim());
      toast.success("Kích hoạt khóa học thành công! Chúc bạn học tập vui vẻ.");
      setCode("");
    } catch (error: unknown) {
      console.error("Lỗi kích hoạt mã:", error);
      const err = error as Error;
      toast.error(err.message || "Kích hoạt mã thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 20px",
        minHeight: "50vh",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "40px 30px",
          textAlign: "center",
          boxShadow: "var(--shadow-premium)",
          border: "1px solid rgba(var(--primary-rgb), 0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Glowing Lock Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "rgba(var(--primary-rgb), 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgb(var(--primary-rgb))",
            marginBottom: "10px",
            boxShadow: "0 0 20px rgba(var(--primary-rgb), 0.1)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px", color: isExpired ? "rgb(239, 68, 68)" : "rgb(var(--foreground-rgb))" }}>
            {isExpired ? "Thời hạn học đã kết thúc" : "Khóa học đang bị khóa"}
          </h2>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem", lineHeight: "1.5" }}>
            {isExpired ? (
              <>
                Quyền truy cập <strong>{courseTitle}</strong> của bạn đã hết hạn học vào ngày <strong>{expiryDate?.toLocaleString("vi-VN")}</strong>. Vui lòng nhập mã kích hoạt mới để gia hạn thời gian học tập.
              </>
            ) : (
              <>
                Nội dung của <strong>{courseTitle}</strong> yêu cầu nhập mã kích hoạt từ giáo viên Ms.Jan để bắt đầu học tập.
              </>
            )}
          </p>
        </div>

        {user ? (
          <form onSubmit={handleRedeem} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            <input
              type="text"
              placeholder="Nhập mã kích hoạt (Ví dụ: IPA-VIP-...)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid rgb(var(--card-border-rgb))",
                fontSize: "0.95rem",
                outline: "none",
                textAlign: "center",
                fontWeight: "600",
                textTransform: "uppercase",
                backgroundColor: "rgba(var(--foreground-rgb), 0.02)",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "rgb(var(--primary-rgb))"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgb(var(--card-border-rgb))"}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
            >
              {loading ? (
                <div style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              ) : (
                "Kích hoạt ngay"
              )}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: "10px", width: "100%" }}>
            <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.85rem", marginBottom: "16px" }}>
              Vui lòng đăng nhập tài khoản Google để nhập mã kích hoạt khóa học này.
            </p>
            <button
              onClick={() => {
                const btn = document.querySelector(".navbar button.btn-primary") as HTMLButtonElement;
                if (btn) {
                  btn.click();
                } else {
                  toast.error("Vui lòng click nút Đăng nhập ở góc phải màn hình.");
                }
              }}
              className="btn btn-outline"
              style={{ width: "100%" }}
            >
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CourseGuard: React.FC<CourseGuardProps> = ({ courseId, courseTitle = "khóa học", children }) => {
  const { role, unlockedCourses, unlockedCoursesExpiry, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ padding: "60px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="skeleton" style={{ width: "200px", height: "40px", margin: "0 auto" }} />
        <div className="skeleton" style={{ width: "400px", height: "20px", margin: "0 auto" }} />
        <div className="card" style={{ maxWidth: "480px", width: "100%", height: "320px", margin: "20px auto", padding: "40px" }}>
          <div className="skeleton skeleton-circle" style={{ width: "80px", height: "80px", margin: "0 auto 20px" }} />
          <div className="skeleton" style={{ width: "150px", height: "24px", margin: "0 auto 12px" }} />
          <div className="skeleton" style={{ width: "250px", height: "16px", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  // Admin và Teacher tự động có quyền truy cập
  if (role === "admin" || role === "teacher") {
    return <>{children}</>;
  }

  // Kiểm tra xem đã mở khóa khóa học này hoặc mở khóa toàn bộ kho học chưa
  const hasAccess = unlockedCourses.includes(courseId) || unlockedCourses.includes("all");

  if (hasAccess) {
    // Kiểm tra thời hạn học tập nếu có
    const expiry = unlockedCoursesExpiry?.[courseId] || unlockedCoursesExpiry?.["all"];
    if (expiry) {
      const expiryDate = new Date(expiry.seconds * 1000);
      if (new Date() > expiryDate) {
        // Đã hết hạn học tập
        return (
          <LockedCourseView
            courseId={courseId}
            courseTitle={courseTitle}
            isExpired={true}
            expiryDate={expiryDate}
          />
        );
      }
    }
    return <>{children}</>;
  }

  return <LockedCourseView courseId={courseId} courseTitle={courseTitle} />;
};
