"use client";

import React from "react";
import Link from "next/link";
import { useIPASyllabus } from "@/hooks/useIPASyllabus";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/useToastStore";
import { getSlugFromIpa } from "@/utils/ipaSlug";
import styles from "./pronunciation.module.css";

const formatSoundName = (name: string) => {
  if (name.startsWith("nguyên âm đôi")) return "Âm đôi";
  if (name.startsWith("phụ âm vô thanh")) return "Vô thanh";
  if (name.startsWith("phụ âm hữu thanh")) return "Hữu thanh";
  if (name.startsWith("phụ âm mũi")) return "Âm mũi";
  if (name.startsWith("bán nguyên âm")) return "Bán nguyên âm";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const getSoundBtnClass = (type: string) => {
  switch (type) {
    case "monophthong_long":
      return styles.soundBtnVowelLong;
    case "monophthong_short":
      return styles.soundBtnVowelShort;
    case "diphthong":
      return styles.soundBtnDiphthong;
    case "consonant_voiceless":
      return styles.soundBtnConsonantVoiceless;
    case "consonant_voiced":
      return styles.soundBtnConsonantVoiced;
    default:
      return "";
  }
};

const getSoundBadgeText = (type: string) => {
  switch (type) {
    case "monophthong_long":
      return "Dài";
    case "monophthong_short":
      return "Ngắn";
    case "diphthong":
      return "Đôi";
    case "consonant_voiceless":
      return "Vô thanh";
    case "consonant_voiced":
      return "Hữu thanh";
    default:
      return "";
  }
};

const HeadphonesIcon = () => (
  <svg 
    className={styles.hoverIconHint} 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export default function PronunciationPage() {
  const { user } = useAuth();
  const {
    sounds,
    loading,
    activeTab,
    setActiveTab,
  } = useIPASyllabus();

  // Cho phép tất cả học viên vào học bình thường
  const hasAccess = true;

  const handleSoundClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasAccess) {
      e.preventDefault();
      if (!user) {
        toast.error("Vui lòng đăng nhập để xem chi tiết âm này và luyện tập.");
      } else {
        toast.error("Vui lòng kích hoạt khóa học để xem chi tiết âm này.");
      }
    }
  };

  if (loading) {
    return (
      <div className={`${styles.loadingContainer} container`}>
        <div className="skeleton" style={{ width: "200px", height: "40px", margin: "0 auto 20px" }} />
        <div className="skeleton" style={{ width: "400px", height: "20px", margin: "0 auto 40px" }} />
        <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
          <div className="skeleton" style={{ width: "120px", height: "45px", borderRadius: "12px" }} />
          <div className="skeleton" style={{ width: "120px", height: "45px", borderRadius: "12px" }} />
          <div className="skeleton" style={{ width: "120px", height: "45px", borderRadius: "12px" }} />
        </div>
      </div>
    );
  }

  // Lọc danh sách âm
  const vowels = sounds.filter(s => s.type.startsWith("monophthong") || s.type === "diphthong");
  const consonants = sounds.filter(s => s.type.startsWith("consonant"));

  return (
    <div className={styles.pageWrapper}>
        <div className="container">
          {/* Header */}
          <div className={styles.pageHeader}>
            <span className="hero-badge">Bảng IPA chuẩn quốc tế</span>
            <h1 className={styles.pageTitle}>
              Luyện Phát Âm Tiếng Anh Chuẩn 44 Âm
            </h1>
            <p className={styles.pageSubtitle}>
              Click chọn từng âm để xem hướng dẫn khẩu hình chi tiết, nghe âm mẫu và luyện đọc thực tế bằng micro.
            </p>
          </div>

          {/* Tabs */}
          <div className={styles.tabBar}>
            <button 
              type="button"
              className={`btn ${activeTab === "all" ? "btn-primary" : "btn-outline"} ${styles.tabBtn}`} 
              onClick={() => setActiveTab("all")}
            >
              Tất cả (44 âm)
            </button>
            <button 
              type="button"
              className={`btn ${activeTab === "vowels" ? "btn-primary" : "btn-outline"} ${styles.tabBtn}`} 
              onClick={() => setActiveTab("vowels")}
            >
              Nguyên âm (20)
            </button>
            <button 
              type="button"
              className={`btn ${activeTab === "consonants" ? "btn-primary" : "btn-outline"} ${styles.tabBtn}`} 
              onClick={() => setActiveTab("consonants")}
            >
              Phụ âm (24)
            </button>
          </div>

          {/* Board Directory */}
          <div className={styles.boardWrapper}>
            
            {/* 1. NGUYÊN ÂM (VOWELS) */}
            {(activeTab === "all" || activeTab === "vowels") && (
              <div className={`${styles.categoryCard} ${styles.vowelCard} card`}>
                <h3 className={`${styles.sectionHeader} ${styles.vowelHeader}`}>
                  <span className={`${styles.sectionDot} ${styles.vowelDot}`} />
                  NGUYÊN ÂM (Vowels)
                </h3>
                
                {/* Monophthongs */}
                <div>
                  <h4 className={styles.subSectionTitle}>
                    Nguyên âm đơn (Monophthongs)
                  </h4>
                  <div className={styles.grid}>
                    {vowels.filter(s => s.type.startsWith("monophthong")).map((sound) => (
                      <Link
                        key={sound.ipa}
                        href={`/pronunciation/${getSlugFromIpa(sound.ipa)}`}
                        onClick={handleSoundClick}
                        className={`${styles.soundBtn} ${getSoundBtnClass(sound.type)}`}
                      >
                        <span className={styles.soundBadgeMini}>{getSoundBadgeText(sound.type)}</span>
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{formatSoundName(sound.name)}</span>
                        <HeadphonesIcon />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Diphthongs */}
                <div className={styles.subSection}>
                  <h4 className={styles.subSectionTitle}>
                    Nguyên âm đôi (Diphthongs)
                  </h4>
                  <div className={styles.grid}>
                    {vowels.filter(s => s.type === "diphthong").map((sound) => (
                      <Link
                        key={sound.ipa}
                        href={`/pronunciation/${getSlugFromIpa(sound.ipa)}`}
                        onClick={handleSoundClick}
                        className={`${styles.soundBtn} ${getSoundBtnClass(sound.type)}`}
                      >
                        <span className={styles.soundBadgeMini}>{getSoundBadgeText(sound.type)}</span>
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{formatSoundName(sound.name)}</span>
                        <HeadphonesIcon />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PHỤ ÂM (CONSONANTS) */}
            {(activeTab === "all" || activeTab === "consonants") && (
              <div className={`${styles.categoryCard} ${styles.consonantCard} card`}>
                <h3 className={`${styles.sectionHeader} ${styles.consonantHeader}`}>
                  <span className={`${styles.sectionDot} ${styles.consonantDot}`} />
                  PHỤ ÂM (Consonants)
                </h3>
                
                {/* Consonant Voiceless */}
                <div>
                  <h4 className={styles.subSectionTitle}>
                    Âm vô thanh (Voiceless)
                  </h4>
                  <div className={styles.grid}>
                    {consonants.filter(s => s.type === "consonant_voiceless").map((sound) => (
                      <Link
                        key={sound.ipa}
                        href={`/pronunciation/${getSlugFromIpa(sound.ipa)}`}
                        onClick={handleSoundClick}
                        className={`${styles.soundBtn} ${getSoundBtnClass(sound.type)}`}
                      >
                        <span className={styles.soundBadgeMini}>{getSoundBadgeText(sound.type)}</span>
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{formatSoundName(sound.name)}</span>
                        <HeadphonesIcon />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Consonant Voiced */}
                <div className={styles.subSection}>
                  <h4 className={styles.subSectionTitle}>
                    Âm hữu thanh (Voiced)
                  </h4>
                  <div className={styles.grid}>
                    {consonants.filter(s => s.type === "consonant_voiced").map((sound) => (
                      <Link
                        key={sound.ipa}
                        href={`/pronunciation/${getSlugFromIpa(sound.ipa)}`}
                        onClick={handleSoundClick}
                        className={`${styles.soundBtn} ${getSoundBtnClass(sound.type)}`}
                      >
                        <span className={styles.soundBadgeMini}>{getSoundBadgeText(sound.type)}</span>
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{formatSoundName(sound.name)}</span>
                        <HeadphonesIcon />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
