"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const { user, role, loginWithGoogle, logout, loading } = useAuth();
  const pathname = usePathname();

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
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
              Trang chủ
            </Link>
          </li>
          <li>
            <Link href="/courses" className={`nav-link ${pathname.startsWith("/courses") ? "active" : ""}`}>
              Khóa học
            </Link>
          </li>
          <li>
            <Link href="/pronunciation" className={`nav-link ${pathname.startsWith("/pronunciation") ? "active" : ""}`}>
              Phát âm (IPA)
            </Link>
          </li>
          {user && (
            <li>
              <Link href="/learning" className={`nav-link ${pathname.startsWith("/learning") ? "active" : ""}`}>
                Lớp học của tôi
              </Link>
            </li>
          )}
          <li>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="skeleton skeleton-circle" style={{ width: "36px", height: "36px" }} />
                <div className="skeleton" style={{ width: "80px", height: "32px", borderRadius: "var(--border-radius)" }} />
              </div>
            ) : user ? (
              <div className="avatar-container">
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
                      display: "block",
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

                {/* Dropdown Menu (Premium UI) */}
                <div className="avatar-dropdown">
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{user.displayName || "Học viên"}</div>
                    <div className="dropdown-email">{user.email}</div>
                  </div>
                  
                  <div className="dropdown-divider" />
                  
                  <ul className="dropdown-menu-list">
                    <li>
                      <Link href="/profile" className="dropdown-menu-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Hồ sơ cá nhân
                      </Link>
                    </li>
                    
                    {/* Admin / Teacher link option */}
                    {(role === "admin" || role === "teacher") && (
                      <li>
                        <Link href="/admin" className="dropdown-menu-item" style={{ color: "rgb(var(--primary-rgb))" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="9" rx="1" />
                            <rect x="14" y="3" width="7" height="5" rx="1" />
                            <rect x="14" y="12" width="7" height="9" rx="1" />
                            <rect x="3" y="16" width="7" height="5" rx="1" />
                          </svg>
                          Trang quản trị
                        </Link>
                      </li>
                    )}
                  </ul>
                  
                  <div className="dropdown-divider" />
                  
                  <button onClick={logout} className="dropdown-menu-item danger">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
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
