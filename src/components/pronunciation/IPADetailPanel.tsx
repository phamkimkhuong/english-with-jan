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
  const [activeMainTab, setActiveMainTab] = React.useState<"theory" | "practice">("theory");
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const { user } = useAuth();

  // Tạo danh sách các media khẩu hình miệng, hỗ trợ tương thích ngược với mouthShapeImage cũ
  const mediaList = React.useMemo(() => {
    if (!selectedSound) return [];
    if (selectedSound.mouthShapeMedia && selectedSound.mouthShapeMedia.length > 0) {
      return selectedSound.mouthShapeMedia;
    }
    if (selectedSound.mouthShapeImage) {
      return [{ type: "image" as const, url: selectedSound.mouthShapeImage }];
    }
    return [];
  }, [selectedSound]);

  const handlePrevMedia = () => {
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNextMedia = () => {
    setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

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
    <div className={styles.detailsWorkspaceContainer}>
      {/* Sound Header with Speaker and Main Tabs - Shared at top */}
      <div className={`${styles.soundHeaderCard} card`}>
        <div className={styles.headerFlexRow}>

          <div className={styles.soundInfoLeft}>
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

            <div className={styles.symbolAndSpeakerRow}>
              <h2 className={styles.soundSymbolTitle}>
                /{selectedSound.ipa}/
              </h2>

              <div className={styles.speakerBtnRow}>
                {/* Loa Nữ */}
                {selectedSound.audioUrl && (
                  <button
                    type="button"
                    onClick={() => playSoundAudio(`${selectedSound.ipa}-female`, selectedSound.audioUrl || "", false)}
                    className={`${styles.speakerBtnCompact} ${playingWord === `${selectedSound.ipa}-female` ? styles.actionBtnPlaying : ""}`}
                    style={{
                      backgroundColor: isConsonant ? "rgb(var(--accent-light-rgb))" : "rgb(var(--primary-light-rgb))",
                      color: isConsonant ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
                    }}
                    title="Nghe giọng Nữ"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    <span>Female</span>
                  </button>
                )}

                {/* Loa Nam */}
                {selectedSound.audioUrlMale && (
                  <button
                    type="button"
                    onClick={() => playSoundAudio(`${selectedSound.ipa}-male`, selectedSound.audioUrlMale || "", false)}
                    className={`${styles.speakerBtnCompact} ${playingWord === `${selectedSound.ipa}-male` ? styles.actionBtnPlaying : ""}`}
                    style={{
                      backgroundColor: isConsonant ? "rgb(var(--accent-light-rgb))" : "rgb(var(--primary-light-rgb))",
                      color: isConsonant ? "rgb(var(--accent-rgb))" : "rgb(var(--primary-rgb))",
                    }}
                    title="Nghe giọng Nam"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    <span>Male</span>
                  </button>
                )}
              </div>

              <span className={styles.soundNameSubtitle}>
                Tên gọi khác: {selectedSound.name}
              </span>
            </div>
          </div>

          {/* Page-level Main Tab navigation */}
          <div className={styles.mainTabBar}>
            <button
              type="button"
              className={`${styles.mainTabBtn} ${activeMainTab === "theory" ? styles.mainTabActive : ""}`}
              onClick={() => setActiveMainTab("theory")}
            >
              📖 Hướng dẫn & Khẩu hình
            </button>
            <button
              type="button"
              className={`${styles.mainTabBtn} ${activeMainTab === "practice" ? styles.mainTabActive : ""}`}
              onClick={() => setActiveMainTab("practice")}
            >
              🗣️ Luyện tập thực hành
            </button>
          </div>

        </div>
      </div>

      {/* Main learning workspace area */}
      <div className={styles.tabContentArea}>
        {activeMainTab === "theory" ? (
          <div className={`${styles.theoryTabContent} card`}>
            <div className={styles.theoryLayoutGrid}>

              {/* Mouth shape representation column */}
              {mediaList.length > 0 && (
                <div className={styles.mouthShapeContainer}>
                  <div className={styles.mouthShapeCardLarge}>
                    <div className={styles.carouselContainer}>
                      {mediaList[activeMediaIndex].type === "video" ? (
                        <video
                          src={mediaList[activeMediaIndex].url}
                          className={styles.carouselMedia}
                          controls
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaList[activeMediaIndex].url}
                          alt={`Minh họa khẩu hình phát âm ${selectedSound.ipa}`}
                          className={styles.carouselMedia}
                        />
                      )}

                      {/* Navigation buttons */}
                      {mediaList.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevMedia}
                            className={`${styles.carouselNavBtn} ${styles.carouselNavBtnLeft}`}
                            title="Ảnh/Video trước"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={handleNextMedia}
                            className={`${styles.carouselNavBtn} ${styles.carouselNavBtnRight}`}
                            title="Ảnh/Video tiếp theo"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>

                    {/* Dot indicators */}
                    {mediaList.length > 1 && (
                      <div className={styles.carouselDots}>
                        {mediaList.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setActiveMediaIndex(index)}
                            className={`${styles.carouselDot} ${index === activeMediaIndex ? styles.carouselDotActive : ""}`}
                            title={`Chuyển tới ảnh/video thứ ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    <h5 className={styles.mouthShapeCaption}>Minh họa khẩu hình</h5>
                  </div>
                </div>
              )}

              {/* Text descriptions column */}
              <div className={styles.theoryTextDetails}>
                <div style={{ marginBottom: "24px" }}>
                  <h4 className={styles.sectionTitle}>
                    📝 Hướng dẫn cách phát âm
                  </h4>
                  <p className={styles.descriptionText}>
                    {selectedSound.description}
                  </p>
                </div>

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
            </div>
          </div>
        ) : (
          <div className={`${styles.practiceTabContent} card`}>
            {/* Luyện tập thực hành */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h4 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                🗣️ Bài tập luyện đọc thực tế
              </h4>
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
        )}
      </div>
    </div>
  );
};

