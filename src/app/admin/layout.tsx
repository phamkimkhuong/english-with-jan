"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role } = useAuth();

  return (
    <AdminGuard>
      <div style={{ display: "flex", minHeight: "85vh", background: "rgba(var(--foreground-rgb), 0.01)" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            borderRight: "1px solid rgb(var(--card-border-rgb))",
            background: "rgb(var(--card-bg-rgb))",
            padding: "30px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ marginBottom: "30px", paddingLeft: "10px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 850, color: "rgb(var(--secondary-rgb))", textTransform: "uppercase", letterSpacing: "1px" }}>
              Bảng Quản Trị
            </h2>
            <p style={{ fontSize: "0.8rem", color: "rgb(var(--primary-rgb))", fontWeight: 600 }}>
              Quyền: {role === "admin" ? "Giáo viên tối cao" : "Giáo viên"}
            </p>
          </div>

          <Link
            href="/admin"
            className={`btn ${pathname === "/admin" ? "btn-primary" : "btn-outline"}`}
            style={{ justifyContent: "flex-start", width: "100%", padding: "12px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            Tổng quan
          </Link>

          <Link
            href="/admin/courses"
            className={`btn ${pathname === "/admin/courses" ? "btn-primary" : "btn-outline"}`}
            style={{ justifyContent: "flex-start", width: "100%", padding: "12px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
            Quản lý khóa học
          </Link>

          <Link
            href="/admin/pronunciation"
            className={`btn ${pathname === "/admin/pronunciation" ? "btn-primary" : "btn-outline"}`}
            style={{ justifyContent: "flex-start", width: "100%", padding: "12px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            Quản lý Phát âm (IPA)
          </Link>

          <Link
            href="/admin/pronunciation/students"
            className={`btn ${pathname.startsWith("/admin/pronunciation/students") ? "btn-primary" : "btn-outline"}`}
            style={{ justifyContent: "flex-start", width: "100%", padding: "12px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Luyện âm của học sinh
          </Link>

          <Link
            href="/admin/access-codes"
            className={`btn ${pathname === "/admin/access-codes" ? "btn-primary" : "btn-outline"}`}
            style={{ justifyContent: "flex-start", width: "100%", padding: "12px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Quản lý mã kích hoạt
          </Link>
        </aside>

        {/* Main Workspace */}
        <main style={{ flex: 1, padding: "40px 30px" }}>
          {/* Workspace Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgb(var(--card-border-rgb))",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
                Chào giáo viên, {user?.displayName || "Jan"}
              </h1>
              <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.9rem" }}>
                Hệ thống quản lý khóa học và theo dõi tiến độ của học sinh.
              </p>
            </div>
          </div>

          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
