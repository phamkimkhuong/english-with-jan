import React from "react";
import { IPASound } from "@/types/pronunciation";
import { ExampleWordCard } from "./ExampleWordCard";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuth } from "@/context/AuthContext";
import { usePracticeSync } from "@/hooks/usePracticeSync";
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
  const [activeSubTab, setActiveSubTab] = React.useState<"word" | "phrase" | "sentence">("word");
  const [genderMode, setGenderMode] = React.useState<"female" | "male">("female");
  const { user } = useAuth();

  const {
    isSupported,
    listeningWord,
    practiceResult,
    recognitionError,
    savedPracticeKey,
    startSpeechPractice,
    setPracticeResult,
  } = useSpeechRecognition();

  // Tích hợp hook đồng bộ hóa tiến trình ghi âm lên Cloud
  usePracticeSync(
    user?.uid || null,
    selectedSound ? selectedSound.ipa : null,
    savedPracticeKey
  );

  if (!selectedSound) {
    return (
      <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
        <p>Vui lòng click chọn một âm bất kỳ trên bảng để xem hướng dẫn khẩu hình chi tiết.</p>
      </div>
    );
  }

  const isConsonant = selectedSound.type.startsWith("consonant");
  const wordExamples = selectedSound.examples.filter((ex) => (!ex.type || ex.type === "word") && ex.hidden !== true);
  const phraseExamples = selectedSound.examples.filter((ex) => ex.type === "phrase" && ex.hidden !== true);
  const sentenceExamples = selectedSound.examples.filter((ex) => ex.type === "sentence" && ex.hidden !== true);

  return (
    <div className={styles.detailsWorkspace}>
      {/* CỘT TRÁI: Lý thuyết & Khẩu hình */}
      <div className={`${styles.theoryColumn} card`}>
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
            <h2 className={styles.soundSymbolTitle}>
              /{selectedSound.ipa}/
            </h2>
            <p className={styles.soundNameSubtitle}>
              Tên gọi khác: {selectedSound.name}
            </p>
          </div>

          {/* Speaker circle */}
          <button
            type="button"
            onClick={() => {
              const audioToPlay = (genderMode === "male" && selectedSound.audioUrlMale)
                ? selectedSound.audioUrlMale
                : selectedSound.audioUrl;
              playSoundAudio(selectedSound.ipa, audioToPlay);
            }}
            className={styles.speakerBtn}
            style={{
              backgroundColor: isConsonant ? "rgb(var(--accent-light-rgb))" : "rgb(var(--primary-light-rgb))",
              color: isConsonant ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        </div>

        {/* Mouth shape representation - Large */}
        {selectedSound.mouthShapeImage && (
          <div className={styles.mouthShapeCardLarge}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedSound.mouthShapeImage}
              alt={`Khẩu hình miệng phát âm ${selectedSound.ipa}`}
              className={styles.mouthShapeImgLarge}
            />
            <h5 className={styles.mouthShapeCaption}>Minh họa khẩu hình</h5>
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
            <h4 className={`${styles.sectionTitle} ${styles.mistakesHeader}`}>
              Lỗi thường gặp của người Việt
            </h4>
            <ul className={styles.mistakesList}>
              {selectedSound.commonMistakes.map((mistake, idx) => (
                <li key={idx}>{mistake}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CỘT PHẢI: Bài tập luyện đọc thực hành */}
      <div className={`${styles.practiceColumn} card`}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h4 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              🗣️ Bài tập luyện đọc thực tế
            </h4>

            {/* Voice Switcher Toggle (Male/Female) */}
            <div className={styles.genderToggleContainer}>
              <button
                type="button"
                className={`${styles.genderToggleBtn} ${genderMode === "female" ? styles.genderToggleActive : ""}`}
                onClick={() => setGenderMode("female")}
              >
                👩‍💼 Nữ
              </button>
              <button
                type="button"
                className={`${styles.genderToggleBtn} ${genderMode === "male" ? styles.genderToggleActive : ""}`}
                onClick={() => setGenderMode("male")}
              >
                👨‍💼 Nam
              </button>
            </div>
          </div>

          {/* Sub-tabs for categories */}
          <div className={styles.subTabBar}>
            <button
              type="button"
              className={`${styles.subTabBtn} ${activeSubTab === "word" ? styles.subTabActive : ""}`}
              onClick={() => setActiveSubTab("word")}
            >
              Từ vựng ({wordExamples.length})
            </button>
            <button
              type="button"
              className={`${styles.subTabBtn} ${activeSubTab === "phrase" ? styles.subTabActive : ""}`}
              onClick={() => setActiveSubTab("phrase")}
            >
              Cụm từ ({phraseExamples.length})
            </button>
            <button
              type="button"
              className={`${styles.subTabBtn} ${activeSubTab === "sentence" ? styles.subTabActive : ""}`}
              onClick={() => setActiveSubTab("sentence")}
            >
              Câu mẫu ({sentenceExamples.length})
            </button>
          </div>

          {!isSupported && (
            <div className={styles.warningCard}>
              Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói qua Micro. Hãy sử dụng Google Chrome hoặc Microsoft Edge để luyện đọc.
            </div>
          )}

          {recognitionError && (
            <div className={styles.errorCard}>
              ⚠️ {recognitionError}
            </div>
          )}

          <div className={styles.practiceList}>
            {activeSubTab === "word" && (
              wordExamples.length > 0 ? (
                wordExamples.map((ex, index) => (
                  <ExampleWordCard
                    key={`word-${index}`}
                    ex={ex}
                    soundIpa={selectedSound.ipa}
                    savedPracticeKey={savedPracticeKey}
                    playingWord={playingWord}
                    listeningWord={listeningWord}
                    practiceResult={practiceResult}
                    setPracticeResult={setPracticeResult}
                    playSoundAudio={playSoundAudio}
                    startSpeechPractice={startSpeechPractice}
                    isSupported={isSupported}
                    genderMode={genderMode}
                  />
                ))
              ) : (
                <p className={styles.emptyText}>
                  Chưa có từ vựng ví dụ nào cho âm này.
                </p>
              )
            )}

            {activeSubTab === "phrase" && (
              phraseExamples.length > 0 ? (
                phraseExamples.map((ex, index) => (
                  <ExampleWordCard
                    key={`phrase-${index}`}
                    ex={ex}
                    soundIpa={selectedSound.ipa}
                    savedPracticeKey={savedPracticeKey}
                    playingWord={playingWord}
                    listeningWord={listeningWord}
                    practiceResult={practiceResult}
                    setPracticeResult={setPracticeResult}
                    playSoundAudio={playSoundAudio}
                    startSpeechPractice={startSpeechPractice}
                    isSupported={isSupported}
                    genderMode={genderMode}
                  />
                ))
              ) : (
                <p className={styles.emptyText}>
                  Chưa có cụm từ ví dụ nào cho âm này.
                </p>
              )
            )}

            {activeSubTab === "sentence" && (
              sentenceExamples.length > 0 ? (
                sentenceExamples.map((ex, index) => (
                  <ExampleWordCard
                    key={`sentence-${index}`}
                    ex={ex}
                    soundIpa={selectedSound.ipa}
                    savedPracticeKey={savedPracticeKey}
                    playingWord={playingWord}
                    listeningWord={listeningWord}
                    practiceResult={practiceResult}
                    setPracticeResult={setPracticeResult}
                    playSoundAudio={playSoundAudio}
                    startSpeechPractice={startSpeechPractice}
                    isSupported={isSupported}
                    genderMode={genderMode}
                  />
                ))
              ) : (
                <p className={styles.emptyText}>
                  Chưa có câu ví dụ nào cho âm này.
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

