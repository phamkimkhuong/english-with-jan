"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const { user, loginWithGoogle, logout, loading } = useAuth();

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </svg>
          <span>English with Jan</span>
        </Link>

        <ul className="nav-links">
          <li>
            <Link href="/" className="nav-link">
              Trang chủ
            </Link>
          </li>
          <li>
            <Link href="/courses" className="nav-link">
              Khóa học
            </Link>
          </li>
          {user && (
            <li>
              <Link href="/learning" className="nav-link">
                Lớp học của tôi
              </Link>
            </li>
          )}
          <li>
            {loading ? (
              <span className="nav-link">Đang tải...</span>
            ) : user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      border: "2px solid rgb(var(--primary-rgb))",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "rgb(var(--primary-rgb))",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </div>
                )}
                <button onClick={logout} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: "8px 16px" }}>
                Đăng nhập với Google
              </button>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};
