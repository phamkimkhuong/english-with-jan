"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./adminGuard.module.css";

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
      <div className={styles.loadingContainer}>
        <div className="spinner" />
        <p className={styles.loadingText}>
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
