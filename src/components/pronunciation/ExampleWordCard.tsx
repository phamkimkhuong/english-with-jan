import React, { useState, useEffect, useCallback } from "react";
import { IPAExample } from "@/types/pronunciation";
import { getLocalPractice } from "@/utils/localPracticeDb";
import styles from "@/app/pronunciation/pronunciation.module.css";

interface ExampleWordCardProps {
  ex: IPAExample;
  soundIpa: string;
  savedPracticeKey: string | null;
  playingWord: string | null;
  listeningWord: string | null;
  practiceResult: {
    word: string;
    spokenText: string;
    isCorrect: boolean;
    confidence: number;
  } | null;
  setPracticeResult: (result: null) => void;
  playSoundAudio: (textToSpeak: string, customAudioUrl: string, isWord: boolean) => void;
  startSpeechPractice: (word: string, soundIpa: string, exampleType: string) => void;
  isSupported?: boolean;
}

export const ExampleWordCard: React.FC<ExampleWordCardProps> = ({
  ex,
  soundIpa,
  savedPracticeKey,
  playingWord,
  listeningWord,
  practiceResult,
  setPracticeResult,
  playSoundAudio,
  startSpeechPractice,
  isSupported = true,
}) => {
  const isWordListening = listeningWord === ex.word;
  const hasResult = practiceResult && practiceResult.word === ex.word;

  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);

  const loadLocalAudio = useCallback(async () => {
    const key = `${soundIpa}_${ex.type || "word"}_${ex.word}`;
    const localData = await getLocalPractice(key);
    if (localData?.audioBlob) {
      setUserAudioUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return URL.createObjectURL(localData.audioBlob);
      });
    }
  }, [soundIpa, ex.word, ex.type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLocalAudio();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLocalAudio]);

  // Cập nhật lại URL phát âm thanh khi có bản thu mới được lưu
  useEffect(() => {
    const key = `${soundIpa}_${ex.type || "word"}_${ex.word}`;
    if (savedPracticeKey === key) {
      const timer = setTimeout(() => {
        loadLocalAudio();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [savedPracticeKey, soundIpa, ex.word, ex.type, loadLocalAudio]);

  // Giải phóng Object URL khi unmount
  useEffect(() => {
    return () => {
      if (userAudioUrl) {
        URL.revokeObjectURL(userAudioUrl);
      }
    };
  }, [userAudioUrl]);

  const playUserAudio = () => {
    if (!userAudioUrl) return;
    setIsPlayingUserAudio(true);
    const audio = new Audio(userAudioUrl);
    audio.onended = () => setIsPlayingUserAudio(false);
    audio.onerror = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  };

  return (
    <div className={styles.wordCard}>
      <div className={styles.wordHeader}>
        <div>
          <span className={styles.wordText}>{ex.word}</span>
          <span className={styles.ipaText}>{ex.ipa}</span>
          <p className={styles.meaningText}>Nghĩa: {ex.meaning}</p>
        </div>
        
        <div className={styles.actionBtnGroup}>
          {/* Nút nghe lại giọng đọc của học viên */}
          {userAudioUrl && (
            <button
              type="button"
              onClick={playUserAudio}
              className={`${styles.actionBtn} ${isPlayingUserAudio ? styles.actionBtnPlaying : ""}`}
              style={{
                backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                color: "rgb(var(--accent-rgb))"
              }}
              title="Nghe lại bản thu âm giọng đọc của bạn"
            >
              {isPlayingUserAudio ? (
                <div className="skeleton skeleton-circle" style={{ width: "16px", height: "16px" }} />
              ) : (
                <span style={{ fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center" }}>🎧</span>
              )}
            </button>
          )}

          {/* Nút loa phát âm chuẩn */}
          <button
            type="button"
            onClick={() => playSoundAudio(ex.word, ex.audioUrl, true)}
            className={`${styles.actionBtn} ${playingWord === ex.word ? styles.actionBtnPlaying : ""}`}
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

          {/* Nút Micro thu âm */}
          <button
            type="button"
            onClick={() => startSpeechPractice(ex.word, soundIpa, ex.type || "word")}
            className={`${styles.actionBtn} ${isWordListening ? styles.micListening : ""} ${!isSupported ? styles.actionBtnDisabled : ""}`}
            disabled={!isSupported}
            title={!isSupported ? "Trình duyệt không hỗ trợ micro luyện đọc" : "Bấm để bắt đầu luyện đọc với micro"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recording status */}
      {isWordListening && (
        <div className={styles.recordingStatus}>
          <span className={styles.pulseDot} />
          Đang thu âm... Hãy nói từ &quot;{ex.word}&quot;
        </div>
      )}

      {/* Result feedback */}
      {hasResult && practiceResult && (
        <div className={`${styles.feedbackBlock} ${practiceResult.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}`}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.1rem", lineHeight: "1" }}>
              {practiceResult.isCorrect ? "🎉" : "😢"}
            </span>
            <div>
              <p className={practiceResult.isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect}>
                {practiceResult.isCorrect ? "Phát âm chính xác!" : "Chưa trùng khớp"}
              </p>
              <p style={{ margin: "2px 0 0 0", color: "rgb(var(--secondary-rgb))" }}>
                Bạn phát âm: <strong>&quot;{practiceResult.spokenText}&quot;</strong> 
                {practiceResult.isCorrect && ` (Độ tương đồng: ${practiceResult.confidence}%)`}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setPracticeResult(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgb(var(--secondary-rgb))", fontSize: "1rem", opacity: 0.6 }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

