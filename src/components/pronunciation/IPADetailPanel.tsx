import React from "react";
import { IPASound } from "@/types/pronunciation";
import { ExampleWordCard } from "./ExampleWordCard";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import styles from "@/app/pronunciation/pronunciation.module.css";

interface IPADetailPanelProps {
  selectedSound: IPASound | null;
  playSoundAudio: (textToSpeak: string, customAudioUrl: string, isWord?: boolean) => void;
  playingWord: string | null;
}

export const IPADetailPanel: React.FC<IPADetailPanelProps> = ({
  selectedSound,
  playSoundAudio,
  playingWord,
}) => {
  const {
    isSupported,
    listeningWord,
    practiceResult,
    recognitionError,
    startSpeechPractice,
    setPracticeResult,
  } = useSpeechRecognition();

  if (!selectedSound) {
    return (
      <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
        <p>Vui lòng click chọn một âm bất kỳ trên bảng để xem hướng dẫn khẩu hình chi tiết.</p>
      </div>
    );
  }

  const isConsonant = selectedSound.type.startsWith("consonant");

  return (
    <div className="card" style={{ padding: "26px", gap: "20px" }}>
      {/* Sound Header with Speaker */}
      <div className={styles.detailHeader}>
        <div>
          <span
            className={styles.soundBadge}
            style={{
              color: isConsonant ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
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
          type="button"
          onClick={() => playSoundAudio(selectedSound.ipa, selectedSound.audioUrl)}
          className={styles.speakerBtn}
          style={{
            backgroundColor: isConsonant ? "rgb(var(--accent-light-rgb))" : "rgb(var(--primary-light-rgb))",
            color: isConsonant ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
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
        <div className={styles.mouthShapeCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedSound.mouthShapeImage}
            alt={`Khẩu hình miệng phát âm ${selectedSound.ipa}`}
            className={styles.mouthShapeImg}
          />
          <div>
            <h5 style={{ fontSize: "0.85rem", fontWeight: 700 }}>Minh họa khẩu hình</h5>
            <p style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>Đặt môi, răng, lưỡi đúng vị trí để có âm phát ra tự nhiên nhất.</p>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <h4 className={styles.sectionTitle}>
          📝 Hướng dẫn cách phát âm
        </h4>
        <p className={styles.descriptionText}>
          {selectedSound.description}
        </p>
      </div>

      {/* Common Mistakes */}
      {selectedSound.commonMistakes && selectedSound.commonMistakes.length > 0 && (
        <div className={styles.mistakesCard}>
          <h4 className={styles.sectionTitle} style={{ color: "rgb(239, 68, 68)" }}>
            ⚠️ Lỗi thường gặp của người Việt
          </h4>
          <ul className={styles.mistakesList}>
            {selectedSound.commonMistakes.map((mistake, idx) => (
              <li key={idx}>{mistake}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Example Words */}
      <div>
        <h4 className={styles.sectionTitle}>
          🗣️ Từ vựng luyện tập thực tế
        </h4>

        {!isSupported && (
          <div className={styles.warningCard} style={{ marginBottom: "12px" }}>
            Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói qua Micro. Hãy sử dụng Google Chrome hoặc Microsoft Edge để luyện đọc.
          </div>
        )}

        {recognitionError && (
          <div className={styles.errorCard}>
            ⚠️ {recognitionError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {selectedSound.examples.map((ex, index) => (
            <ExampleWordCard
              key={index}
              ex={ex}
              playingWord={playingWord}
              listeningWord={listeningWord}
              practiceResult={practiceResult}
              setPracticeResult={setPracticeResult}
              playSoundAudio={playSoundAudio}
              startSpeechPractice={startSpeechPractice}
              isSupported={isSupported}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
