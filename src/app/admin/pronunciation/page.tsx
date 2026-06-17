"use client";

import React from "react";
import { useAdminIPASyllabus } from "@/hooks/useAdminIPASyllabus";
import { AdminIPASoundForm } from "./_components/AdminIPASoundForm";

export default function AdminPronunciationPage() {
  const {
    sounds,
    selectedSound,
    loading,
    selectSoundToEdit,
    handlePublishSuccess,
  } = useAdminIPASyllabus();

  const [isListCollapsed, setIsListCollapsed] = React.useState(false);

  if (loading) {
    return <div style={{ padding: "40px 0" }}>Đang tải cấu trúc dữ liệu phát âm...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgb(var(--card-border-rgb))", paddingBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Quản lý 44 Âm Phát Âm Quốc Tế
          </h2>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.85rem" }}>
            Chỉnh sửa chi tiết cách phát âm, từ vựng ví dụ và tệp âm thanh hướng dẫn.
          </p>
        </div>
      </div>

      {/* Top panel: 44 Sounds List (Collapsible) */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Bảng 44 Âm Phát Âm Quốc Tế
            {selectedSound && (
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgb(var(--primary-rgb))", background: "rgb(var(--primary-light-rgb))", padding: "2px 10px", borderRadius: "12px", marginLeft: "8px" }}>
                Đang chọn: /{selectedSound.ipa}/
              </span>
            )}
          </h4>
          
          <button
            type="button"
            onClick={() => setIsListCollapsed(!isListCollapsed)}
            className="btn btn-outline"
            style={{
              fontSize: "0.75rem",
              fontWeight: "bold",
              padding: "6px 12px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isListCollapsed ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
                Hiện bảng âm
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6"/>
                </svg>
                Ẩn bảng âm
              </>
            )}
          </button>
        </div>

        {!isListCollapsed && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: "8px", marginTop: "4px" }}>
            {sounds.map((sound) => {
              const isSelected = selectedSound?.ipa === sound.ipa;
              return (
                <button
                  key={sound.ipa}
                  type="button"
                  onClick={() => selectSoundToEdit(sound)}
                  style={{
                    height: "44px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                    background: isSelected ? "rgb(var(--primary-light-rgb))" : "transparent",
                    color: isSelected ? "rgb(var(--primary-rgb))" : "inherit",
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.95rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  /{sound.ipa}/
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom panel: Edit form */}
      <div style={{ width: "100%" }}>
        {selectedSound ? (
          <AdminIPASoundForm
            key={selectedSound.ipa}
            selectedSound={selectedSound}
            sounds={sounds}
            onPublishSuccess={handlePublishSuccess}
          />
        ) : (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
            Chọn một âm ở bảng phía trên để bắt đầu chỉnh sửa.
          </div>
        )}
      </div>
    </div>
  );
}
