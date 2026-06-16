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

      {/* Split interface */}
      <div className="admin-split-layout">
        {/* Left column: 44 Sounds list */}
        <div className="admin-col-left" style={{ borderRight: "1px solid rgb(var(--card-border-rgb))", paddingRight: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))" }}>Danh sách 44 âm:</h4>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "8px" }}>
            {sounds.map((sound) => (
              <button
                key={sound.ipa}
                type="button"
                onClick={() => selectSoundToEdit(sound)}
                style={{
                  height: "50px",
                  borderRadius: "8px",
                  border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                  background: selectedSound?.ipa === sound.ipa ? "rgb(var(--primary-light-rgb))" : "transparent",
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                }}
              >
                /{sound.ipa}/
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Edit form */}
        <div className="admin-col-right">
          {selectedSound ? (
            <AdminIPASoundForm
              key={selectedSound.ipa}
              selectedSound={selectedSound}
              sounds={sounds}
              onPublishSuccess={handlePublishSuccess}
            />
          ) : (
            <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
              Chọn một âm bên trái để bắt đầu chỉnh sửa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
