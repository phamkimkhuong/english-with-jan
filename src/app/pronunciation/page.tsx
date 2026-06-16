"use client";

import React from "react";
import { useIPASyllabus } from "@/hooks/useIPASyllabus";
import { IPADetailPanel } from "@/components/pronunciation/IPADetailPanel";
import { CourseGuard } from "@/components/common/CourseGuard";
import styles from "./pronunciation.module.css";

export default function PronunciationPage() {
  const {
    sounds,
    selectedSound,
    setSelectedSound,
    loading,
    activeTab,
    setActiveTab,
    playingWord,
    playSoundAudio,
  } = useIPASyllabus();

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
    <CourseGuard courseId="ipa" courseTitle="Luyện phát âm chuẩn IPA">
      <div style={{ padding: "40px 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <span className="hero-badge">Bảng IPA chuẩn quốc tế</span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "8px", marginBottom: "12px", letterSpacing: "-1px" }}>
            Luyện Phát Âm Tiếng Anh Chuẩn 44 Âm
          </h1>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "1.1rem", maxWidth: "650px", margin: "0 auto" }}>
            Click chọn từng âm để xem chi tiết khẩu hình miệng, nghe âm thanh phát âm chuẩn và các từ ví dụ đi kèm.
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabBar}>
          <button 
            type="button"
            className={`btn ${activeTab === "all" ? "btn-primary" : "btn-outline"}`} 
            onClick={() => setActiveTab("all")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            Tất cả (44 âm)
          </button>
          <button 
            type="button"
            className={`btn ${activeTab === "vowels" ? "btn-primary" : "btn-outline"}`} 
            onClick={() => setActiveTab("vowels")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            Nguyên âm (20)
          </button>
          <button 
            type="button"
            className={`btn ${activeTab === "consonants" ? "btn-primary" : "btn-outline"}`} 
            onClick={() => setActiveTab("consonants")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            Phụ âm (24)
          </button>
        </div>

        {/* Split Workspace */}
        <div className="split-layout">
          
          {/* Left Area: IPA Interactive Board */}
          <div className="split-col-left" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* 1. NGUYÊN ÂM (VOWELS) */}
            {(activeTab === "all" || activeTab === "vowels") && (
              <div className="card" style={{ padding: "20px", gap: "16px" }}>
                <h3 className={styles.sectionHeader} style={{ color: "rgb(var(--primary-rgb))" }}>
                  <span className={styles.sectionDot} style={{ background: "rgb(var(--primary-rgb))" }} />
                  NGUYÊN ÂM (Vowels)
                </h3>
                
                {/* Monophthongs */}
                <div>
                  <h4 className={styles.subSectionTitle}>
                    Nguyên âm đơn (Monophthongs)
                  </h4>
                  <div className={styles.grid}>
                    {vowels.filter(s => s.type.startsWith("monophthong")).map((sound) => (
                      <button
                        key={sound.ipa}
                        type="button"
                        onClick={() => setSelectedSound(sound)}
                        className={`${styles.soundBtn} ${styles.soundBtnVowel} ${selectedSound?.ipa === sound.ipa ? styles.soundBtnVowelSelected : ""}`}
                      >
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diphthongs */}
                <div style={{ marginTop: "10px" }}>
                  <h4 className={styles.subSectionTitle}>
                    Nguyên âm đôi (Diphthongs)
                  </h4>
                  <div className={styles.grid}>
                    {vowels.filter(s => s.type === "diphthong").map((sound) => (
                      <button
                        key={sound.ipa}
                        type="button"
                        onClick={() => setSelectedSound(sound)}
                        className={`${styles.soundBtn} ${styles.soundBtnVowel} ${selectedSound?.ipa === sound.ipa ? styles.soundBtnVowelSelected : ""}`}
                      >
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PHỤ ÂM (CONSONANTS) */}
            {(activeTab === "all" || activeTab === "consonants") && (
              <div className="card" style={{ padding: "20px", gap: "16px" }}>
                <h3 className={styles.sectionHeader} style={{ color: "rgb(var(--accent-rgb))" }}>
                  <span className={styles.sectionDot} style={{ background: "rgb(var(--accent-rgb))" }} />
                  PHỤ ÂM (Consonants)
                </h3>
                
                {/* Consonant Voiceless */}
                <div>
                  <h4 className={styles.subSectionTitle}>
                    Âm vô thanh (Voiceless)
                  </h4>
                  <div className={styles.grid}>
                    {consonants.filter(s => s.type === "consonant_voiceless").map((sound) => (
                      <button
                        key={sound.ipa}
                        type="button"
                        onClick={() => setSelectedSound(sound)}
                        className={`${styles.soundBtn} ${styles.soundBtnConsonant} ${selectedSound?.ipa === sound.ipa ? styles.soundBtnConsonantSelected : ""}`}
                      >
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consonant Voiced */}
                <div style={{ marginTop: "10px" }}>
                  <h4 className={styles.subSectionTitle}>
                    Âm hữu thanh (Voiced)
                  </h4>
                  <div className={styles.grid}>
                    {consonants.filter(s => s.type === "consonant_voiced").map((sound) => (
                      <button
                        key={sound.ipa}
                        type="button"
                        onClick={() => setSelectedSound(sound)}
                        className={`${styles.soundBtn} ${styles.soundBtnConsonant} ${selectedSound?.ipa === sound.ipa ? styles.soundBtnConsonantSelected : ""}`}
                      >
                        <span className={styles.soundBtnSymbol}>/{sound.ipa}/</span>
                        <span className={styles.soundBtnName}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Detail Panel */}
          <div className="split-col-right">
            <IPADetailPanel
              key={selectedSound?.ipa || "empty"}
              selectedSound={selectedSound}
              playSoundAudio={playSoundAudio}
              playingWord={playingWord}
            />
          </div>

        </div>
      </div>
    </div>
    </CourseGuard>
  );
}
