"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAdminIPASyllabus } from "@/hooks/useAdminIPASyllabus";
import { AdminIPASoundForm } from "./_components/AdminIPASoundForm";
import styles from "./_components/adminPronunciation.module.css";

export default function AdminPronunciationPage() {
  const {
    sounds,
    selectedSound,
    loading,
    selectSoundToEdit,
    handlePublishSuccess,
  } = useAdminIPASyllabus();

  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "monophthong" | "diphthong" | "consonant">("all");

  // Logic lọc danh sách các âm IPA
  const filteredSounds = useMemo(() => {
    let result = sounds;

    // Lọc theo danh mục phân loại
    if (selectedCategory !== "all") {
      result = result.filter((sound) => {
        if (selectedCategory === "monophthong") {
          return sound.type === "monophthong_long" || sound.type === "monophthong_short";
        }
        if (selectedCategory === "diphthong") {
          return sound.type === "diphthong";
        }
        if (selectedCategory === "consonant") {
          return sound.type === "consonant_voiceless" || sound.type === "consonant_voiced";
        }
        return true;
      });
    }

    // Lọc theo từ khóa tìm kiếm (IPA, tên âm, mô tả, từ ví dụ, dịch nghĩa ví dụ)
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (cleanQuery) {
      const queryWithNoSlashes = cleanQuery.replace(/^\/+|\/+$/g, "");
      result = result.filter((sound) => {
        // Khớp ký tự IPA
        if (sound.ipa.toLowerCase().includes(queryWithNoSlashes)) return true;
        // Khớp tên âm
        if (sound.name.toLowerCase().includes(cleanQuery)) return true;
        // Khớp mô tả khẩu hình miệng
        if (sound.description.toLowerCase().includes(cleanQuery)) return true;
        // Khớp lỗi thường gặp
        if (sound.commonMistakes.some(m => m.toLowerCase().includes(cleanQuery))) return true;
        // Khớp danh sách ví dụ (Từ vựng, Phiên âm ví dụ, Dịch nghĩa tiếng Việt)
        if (sound.examples.some((ex) => (
          ex.word.toLowerCase().includes(cleanQuery) ||
          ex.meaning.toLowerCase().includes(cleanQuery) ||
          ex.ipa.toLowerCase().includes(cleanQuery) ||
          (ex.partOfSpeech && ex.partOfSpeech.toLowerCase().includes(cleanQuery))
        ))) {
          return true;
        }
        return false;
      });
    }

    return result;
  }, [sounds, selectedCategory, searchQuery]);

  // Âm đang được hiển thị trong form chỉnh sửa
  const activeSound = useMemo(() => {
    return filteredSounds.find(s => s.ipa === selectedSound?.ipa) || filteredSounds[0] || null;
  }, [filteredSounds, selectedSound]);

  // Tự động chuyển âm đang chọn sang âm đầu tiên tìm thấy khi bộ lọc thay đổi và âm cũ bị ẩn đi
  useEffect(() => {
    if (filteredSounds.length > 0) {
      const isStillVisible = filteredSounds.some(s => s.ipa === selectedSound?.ipa);
      if (!isStillVisible) {
        selectSoundToEdit(filteredSounds[0]);
      }
    }
  }, [filteredSounds, selectedSound, selectSoundToEdit]);

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

      {/* Top panel: Bảng 44 âm & Bộ lọc tìm kiếm */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Bảng 44 Âm Phát Âm Quốc Tế
            {activeSound && (
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgb(var(--primary-rgb))", background: "rgb(var(--primary-light-rgb))", padding: "2px 10px", borderRadius: "12px", marginLeft: "8px" }}>
                Đang chọn: /{activeSound.ipa}/
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
          <>
            {/* Thanh công cụ Tìm kiếm & Bộ lọc */}
            <div className={styles.searchFilterRow}>
              {/* Ô tìm kiếm */}
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm theo IPA (i:, æ), tên âm, từ ví dụ, dịch nghĩa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={styles.clearSearchBtn}
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Nút lọc nhanh theo danh mục */}
              <div className={styles.filterBadgeGroup}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`${styles.filterBadge} ${selectedCategory === "all" ? styles.filterBadgeActive : ""}`}
                >
                  Tất cả ({sounds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("monophthong")}
                  className={`${styles.filterBadge} ${selectedCategory === "monophthong" ? styles.filterBadgeActive : ""}`}
                >
                  Nguyên âm đơn ({sounds.filter(s => s.type === "monophthong_long" || s.type === "monophthong_short").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("diphthong")}
                  className={`${styles.filterBadge} ${selectedCategory === "diphthong" ? styles.filterBadgeActive : ""}`}
                >
                  Nguyên âm đôi ({sounds.filter(s => s.type === "diphthong").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("consonant")}
                  className={`${styles.filterBadge} ${selectedCategory === "consonant" ? styles.filterBadgeActive : ""}`}
                >
                  Phụ âm ({sounds.filter(s => s.type === "consonant_voiceless" || s.type === "consonant_voiced").length})
                </button>
              </div>
            </div>

            {/* Danh sách lưới các âm */}
            {filteredSounds.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: "8px", marginTop: "4px" }}>
                {filteredSounds.map((sound) => {
                  const isSelected = activeSound?.ipa === sound.ipa;
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
            ) : (
              <div className={styles.noResultsContainer}>
                <p className={styles.noResultsText}>
                  Không tìm thấy âm nào khớp với từ khóa &ldquo;<strong>{searchQuery}</strong>&rdquo; hoặc bộ lọc hiện tại.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className={`${styles.resetSearchBtn} btn btn-outline`}
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom panel: Form chỉnh sửa */}
      <div style={{ width: "100%" }}>
        {activeSound ? (
          <AdminIPASoundForm
            key={activeSound.ipa}
            selectedSound={activeSound}
            sounds={sounds}
            onPublishSuccess={handlePublishSuccess}
          />
        ) : (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
            Vui lòng chọn một âm hợp lệ hoặc đặt lại tìm kiếm để bắt đầu chỉnh sửa.
          </div>
        )}
      </div>
    </div>
  );
}
