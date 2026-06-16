"use client";

import React, { useState, useEffect } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

interface IPAExample {
  word: string;
  ipa: string;
  meaning: string;
  audioUrl: string;
}

interface IPASound {
  ipa: string;
  name: string;
  type: "monophthong_long" | "monophthong_short" | "diphthong" | "consonant_voiceless" | "consonant_voiced";
  description: string;
  mouthShapeImage: string;
  instructionVideo?: string;
  audioUrl: string;
  examples: IPAExample[];
  commonMistakes: string[];
}

export default function PronunciationPage() {
  const [sounds, setSounds] = useState<IPASound[]>([]);
  const [selectedSound, setSelectedSound] = useState<IPASound | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "vowels" | "consonants">("all");
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  useEffect(() => {
    const loadIPASyllabus = async () => {
      try {
        setLoading(true);
        // 1. Cố gắng lấy tệp từ Firebase Storage trước
        const fileRef = ref(storage, "syllabuses/pronunciation_ipa.json");
        const downloadUrl = await getDownloadURL(fileRef);
        const res = await fetch(downloadUrl);
        const data = await res.json();
        if (data && data.sounds) {
          setSounds(data.sounds);
          // Mặc định chọn âm đầu tiên
          if (data.sounds.length > 0) setSelectedSound(data.sounds[0]);
          return;
        }
      } catch (storageError) {
        console.warn("Chưa có tệp trên Firebase Storage, đang tải tệp mặc định...", storageError);
      }

      // 2. Fallback nếu Storage chưa có hoặc lỗi: Tải từ public/data/default_ipa.json
      try {
        const res = await fetch("/data/default_ipa.json");
        const data = await res.json();
        if (data && data.sounds) {
          setSounds(data.sounds);
          if (data.sounds.length > 0) setSelectedSound(data.sounds[0]);
        }
      } catch (localError) {
        console.error("Lỗi tải tệp IPA mặc định:", localError);
      } finally {
        setLoading(false);
      }
    };

    loadIPASyllabus();
  }, []);

  // Hàm phát âm thanh (Fallback sang Web Speech API nếu chưa có file audio upload)
  const playSoundAudio = (textToSpeak: string, customAudioUrl: string, isWord = false) => {
    if (customAudioUrl) {
      const audio = new Audio(customAudioUrl);
      audio.play().catch((err) => {
        console.warn("Lỗi phát audio file, đang dùng Text-to-Speech thay thế:", err);
        speakWithTTS(textToSpeak, isWord);
      });
    } else {
      speakWithTTS(textToSpeak, isWord);
    }
  };

  const speakWithTTS = (text: string, isWord: boolean) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    // Đang phát từ nào thì hiển thị trạng thái
    if (isWord) {
      setPlayingWord(text);
      setTimeout(() => setPlayingWord(null), 1000);
    }

    // Dọn sạch âm thanh đang nói dở
    window.speechSynthesis.cancel();

    // Loại bỏ các ký tự gạch chéo cho IPA nếu muốn phát âm trực tiếp
    const cleanedText = text.replace(/\//g, "");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = "en-US";
    // Nếu phát âm âm đơn thì giảm tốc độ nói xuống một chút để dễ nghe hơn
    utterance.rate = isWord ? 0.9 : 0.6;
    
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "80px 0", textAlign: "center" }}>
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
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
          <button 
            className={`btn ${activeTab === "all" ? "btn-primary" : "btn-outline"}`} 
            onClick={() => setActiveTab("all")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            Tất cả (44 âm)
          </button>
          <button 
            className={`btn ${activeTab === "vowels" ? "btn-primary" : "btn-outline"}`} 
            onClick={() => setActiveTab("vowels")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            Nguyên âm (20)
          </button>
          <button 
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
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "rgb(var(--primary-rgb))", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgb(var(--primary-rgb))" }} />
                  NGUYÊN ÂM (Vowels)
                </h3>
                
                {/* Monophthongs */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Nguyên âm đơn (Monophthongs)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "10px" }}>
                    {vowels.filter(s => s.type.startsWith("monophthong")).map((sound) => (
                      <button
                        key={sound.ipa}
                        onClick={() => setSelectedSound(sound)}
                        style={{
                          height: "65px",
                          borderRadius: "10px",
                          border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                          background: selectedSound?.ipa === sound.ipa ? "rgb(var(--primary-light-rgb))" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "rgb(var(--foreground-rgb))" }}>/{sound.ipa}/</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.7, color: "rgb(var(--secondary-rgb))" }}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diphthongs */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Nguyên âm đôi (Diphthongs)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "10px" }}>
                    {vowels.filter(s => s.type === "diphthong").map((sound) => (
                      <button
                        key={sound.ipa}
                        onClick={() => setSelectedSound(sound)}
                        style={{
                          height: "65px",
                          borderRadius: "10px",
                          border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                          background: selectedSound?.ipa === sound.ipa ? "rgb(var(--primary-light-rgb))" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "rgb(var(--foreground-rgb))" }}>/{sound.ipa}/</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.7, color: "rgb(var(--secondary-rgb))" }}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PHỤ ÂM (CONSONANTS) */}
            {(activeTab === "all" || activeTab === "consonants") && (
              <div className="card" style={{ padding: "20px", gap: "16px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "rgb(var(--accent-rgb))", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgb(var(--accent-rgb))" }} />
                  PHỤ ÂM (Consonants)
                </h3>
                
                {/* Voiceless */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Âm vô thanh (Voiceless - Bật hơi, cổ họng không rung)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "10px" }}>
                    {consonants.filter(s => s.type === "consonant_voiceless").map((sound) => (
                      <button
                        key={sound.ipa}
                        onClick={() => setSelectedSound(sound)}
                        style={{
                          height: "65px",
                          borderRadius: "10px",
                          border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--accent-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                          background: selectedSound?.ipa === sound.ipa ? "rgb(var(--accent-light-rgb))" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "rgb(var(--foreground-rgb))" }}>/{sound.ipa}/</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.7, color: "rgb(var(--secondary-rgb))" }}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voiced */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Âm hữu thanh (Voiced - Rung cổ họng)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "10px" }}>
                    {consonants.filter(s => s.type === "consonant_voiced").map((sound) => (
                      <button
                        key={sound.ipa}
                        onClick={() => setSelectedSound(sound)}
                        style={{
                          height: "65px",
                          borderRadius: "10px",
                          border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--accent-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                          background: selectedSound?.ipa === sound.ipa ? "rgb(var(--accent-light-rgb))" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "rgb(var(--foreground-rgb))" }}>/{sound.ipa}/</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.7, color: "rgb(var(--secondary-rgb))" }}>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Detail Panel */}
          <div className="split-col-right">
            {selectedSound ? (
              <div className="card" style={{ padding: "26px", gap: "20px" }}>
                {/* Sound Header with Speaker */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span 
                      style={{ 
                        fontSize: "0.8rem", 
                        fontWeight: 700, 
                        color: selectedSound.type.startsWith("consonant") ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {selectedSound.type.includes("long") ? "Nguyên âm đơn dài" : 
                       selectedSound.type.includes("short") ? "Nguyên âm đơn ngắn" :
                       selectedSound.type === "diphthong" ? "Nguyên âm đôi" :
                       selectedSound.type === "consonant_voiceless" ? "Phụ âm vô thanh" : "Phụ âm hữu thanh"}
                    </span>
                    <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "rgb(var(--foreground-rgb))", marginTop: "4px" }}>
                      /{selectedSound.ipa}/
                    </h2>
                    <p style={{ fontSize: "0.95rem", color: "rgb(var(--secondary-rgb))", fontWeight: 500 }}>
                      Tên gọi khác: {selectedSound.name}
                    </p>
                  </div>
                  
                  {/* Speaker circle */}
                  <button 
                    onClick={() => playSoundAudio(selectedSound.ipa, selectedSound.audioUrl)}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: selectedSound.type.startsWith("consonant") ? "rgb(var(--accent-light-rgb))" : "rgb(var(--primary-light-rgb))",
                      color: selectedSound.type.startsWith("consonant") ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.1s ease",
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  </button>
                </div>

                {/* Mouth shape representation */}
                {selectedSound.mouthShapeImage && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(var(--foreground-rgb), 0.02)", padding: "12px", borderRadius: "10px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedSound.mouthShapeImage} 
                      alt={`Khẩu hình miệng phát âm ${selectedSound.ipa}`}
                      style={{ width: "65px", height: "65px", borderRadius: "8px", objectFit: "cover" }}
                    />
                    <div>
                      <h5 style={{ fontSize: "0.85rem", fontWeight: 700 }}>Minh họa khẩu hình</h5>
                      <p style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>Đặt môi, răng, lưỡi đúng vị trí để có âm phát ra tự nhiên nhất.</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    📝 Hướng dẫn cách phát âm
                  </h4>
                  <p style={{ fontSize: "0.92rem", color: "rgb(var(--secondary-rgb))", lineHeight: "1.5" }}>
                    {selectedSound.description}
                  </p>
                </div>

                {/* Common Mistakes */}
                {selectedSound.commonMistakes && selectedSound.commonMistakes.length > 0 && (
                  <div style={{ background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.1)", padding: "16px", borderRadius: "12px" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "rgb(239, 68, 68)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      ⚠️ Lỗi thường gặp của người Việt
                    </h4>
                    <ul style={{ paddingLeft: "16px", fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {selectedSound.commonMistakes.map((mistake, idx) => (
                        <li key={idx}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example Words */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    🗣️ Từ vựng luyện tập thực tế
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedSound.examples.map((ex, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "10px 14px", 
                          borderRadius: "10px", 
                          border: "1px solid rgb(var(--card-border-rgb))",
                          background: "rgba(var(--foreground-rgb), 0.01)",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgb(var(--foreground-rgb))" }}>{ex.word}</span>
                          <span style={{ fontSize: "0.9rem", color: "rgb(var(--primary-rgb))", marginLeft: "10px", fontFamily: "monospace" }}>{ex.ipa}</span>
                          <p style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", marginTop: "2px" }}>Nghĩa: {ex.meaning}</p>
                        </div>
                        
                        {/* Play button */}
                        <button
                          onClick={() => playSoundAudio(ex.word, ex.audioUrl, true)}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "transparent",
                            border: "1px solid rgb(var(--card-border-rgb))",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: playingWord === ex.word ? "rgb(var(--accent-rgb))" : "rgb(var(--secondary-rgb))",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {playingWord === ex.word ? (
                            <div className="skeleton skeleton-circle" style={{ width: "16px", height: "16px" }} />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
                <p>Vui lòng click chọn một âm bất kỳ trên bảng để xem hướng dẫn khẩu hình chi tiết.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
