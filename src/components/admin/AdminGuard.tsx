"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Nếu đã tải xong thông tin và phát hiện không phải admin hay giáo viên, trục xuất về trang chủ
    if (!loading && (!user || (role !== "admin" && role !== "teacher"))) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgb(var(--primary-light-rgb))",
            borderTopColor: "rgb(var(--primary-rgb))",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.95rem" }}>
          Đang xác thực quyền truy cập trang quản trị...
        </p>
      </div>
    );
  }

  // Nếu là admin hoặc teacher, cho phép truy cập
  if (user && (role === "admin" || role === "teacher")) {
    return <>{children}</>;
  }

  // Trả về null khi chuyển hướng
  return null;
};
