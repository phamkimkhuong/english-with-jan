import React, { useState, useRef, useEffect } from "react";
import { IPASound, IPAExample } from "@/types/pronunciation";
import { publishIPASyllabus, uploadPronunciationMedia } from "@/services/pronunciationService";
import { toast } from "@/hooks/useToastStore";
import { storage } from "@/lib/firebase/config";
import { createLogger } from "@/utils/logger";
import { IPAMediaManager } from "./IPAMediaManager";
import styles from "./adminPronunciation.module.css";

const logger = createLogger("AdminIPASoundForm");

interface AdminIPASoundFormProps {
  selectedSound: IPASound;
  sounds: IPASound[];
  onPublishSuccess: (updatedSounds: IPASound[]) => void;
}

export const AdminIPASoundForm: React.FC<AdminIPASoundFormProps> = ({
  selectedSound,
  sounds,
  onPublishSuccess,
}) => {
  const [editSound, setEditSound] = useState<IPASound>(() => JSON.parse(JSON.stringify(selectedSound)));
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [activeExampleTab, setActiveExampleTab] = useState<"word" | "phrase" | "sentence">("word");

  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Tự động co giãn chiều cao của ô nhập liệu khẩu hình dựa theo nội dung văn bản
  useEffect(() => {
    const textarea = descriptionRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight + 2}px`;
    }
  }, [editSound.description]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    targetField: string,
    exampleIndex?: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = exampleIndex !== undefined ? `${targetField}_${exampleIndex}` : targetField;
    setUploadingField(key);

    try {
      // Dọn dẹp tệp cũ trên Firebase Storage nếu có
      let oldUrl = "";
      if (targetField === "mouthShapeImage") {
        oldUrl = editSound.mouthShapeImage;
      } else if (targetField === "audioUrl") {
        oldUrl = editSound.audioUrl;
      } else if (targetField === "audioUrlMale") {
        oldUrl = editSound.audioUrlMale || "";
      } else if (exampleIndex !== undefined) {
        const targetEx = editSound.examples[exampleIndex];
        if (targetField === "exampleAudio" || targetField === "exampleAudioMale") {
          // exampleAudio ứng với audioUrl, exampleAudioMale ứng với audioUrlMale
          oldUrl = targetField === "exampleAudio" ? targetEx.audioUrl : (targetEx.audioUrlMale || "");
        }
      }

      if (oldUrl && oldUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const { deleteObject, ref: storageRef } = await import("firebase/storage");
          const decodedUrl = decodeURIComponent(oldUrl);
          const startIndex = decodedUrl.indexOf("/o/") + 3;
          const endIndex = decodedUrl.indexOf("?alt=media");
          if (startIndex > 2 && endIndex > startIndex) {
            const filePath = decodedUrl.substring(startIndex, endIndex);
            const oldFileRef = storageRef(storage, filePath);
            await deleteObject(oldFileRef);
            logger.log("Đã xóa file cũ trên Firebase Storage:", filePath);
          }
        } catch (deleteErr) {
          logger.warn("Lỗi dọn dẹp file cũ trên Firebase Storage (hoặc file không tồn tại):", deleteErr);
        }
      }

      const url = await uploadPronunciationMedia(file, folder);

      setEditSound((prev) => {
        if (targetField === "mouthShapeImage") {
          return { ...prev, mouthShapeImage: url };
        } else if (targetField === "audioUrl") {
          return { ...prev, audioUrl: url };
        } else if (targetField === "audioUrlMale") {
          return { ...prev, audioUrlMale: url };
        } else if (targetField === "exampleAudio" && exampleIndex !== undefined) {
          const updatedExamples = [...prev.examples];
          updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrl: url };
          return { ...prev, examples: updatedExamples };
        } else if (targetField === "exampleAudioMale" && exampleIndex !== undefined) {
          const updatedExamples = [...prev.examples];
          updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrlMale: url };
          return { ...prev, examples: updatedExamples };
        }
        return prev;
      });
      toast.success("Tải ảnh/âm thanh lên thành công!");
    } catch (err: unknown) {
      logger.error("Lỗi tải lên tệp:", err);
      toast.error("Không thể tải tệp lên. Vui lòng kiểm tra dung lượng hoặc kết nối mạng.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleGenerateAIAudio = async (
    text: string,
    ipa?: string,
    isExample = false,
    exampleIndex?: number,
    gender: "female" | "male" = "female"
  ) => {
    if (!text || text.trim() === "") {
      toast.error("Vui lòng nhập Từ vựng / Câu mẫu trước khi sinh giọng đọc AI.");
      return;
    }

    const functionUrl = process.env.NEXT_PUBLIC_GCP_TTS_FUNCTION_URL;
    const apiKey = process.env.NEXT_PUBLIC_TTS_API_KEY;

    if (!functionUrl || functionUrl.trim() === "") {
      toast.error("NEXT_PUBLIC_GCP_TTS_FUNCTION_URL chưa được thiết lập trong .env.local.");
      return;
    }

    const key = isExample && exampleIndex !== undefined ? `exampleAudio_${gender}_${exampleIndex}` : `audioUrl_${gender}`;
    setGeneratingField(key);

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
        },
        body: JSON.stringify({
          text: text.trim(),
          ipa: ipa ? ipa.trim() : undefined,
          speed: "normal",
          accent: "en-US", // Default to American English accent as requested
          gender,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Lỗi HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.audioUrl) {
        setEditSound((prev) => {
          if (isExample && exampleIndex !== undefined) {
            const updatedExamples = [...prev.examples];
            if (gender === "male") {
              updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrlMale: data.audioUrl };
            } else {
              updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrl: data.audioUrl };
            }
            return { ...prev, examples: updatedExamples };
          } else {
            if (gender === "male") {
              return { ...prev, audioUrlMale: data.audioUrl };
            } else {
              return { ...prev, audioUrl: data.audioUrl };
            }
          }
        });
        toast.success(`Sinh giọng nói AI ${gender === "male" ? "Nam" : "Nữ"} bản xứ thành công!`);
      } else {
        throw new Error("Không nhận được audioUrl từ phản hồi.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Lỗi sinh giọng nói AI:", err);
      toast.error(`Lỗi sinh giọng AI: ${errorMsg || "Không thể kết nối tới Google Cloud Function"}`);
    } finally {
      setGeneratingField(null);
    }
  };

  const playAudio = (url?: string) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch((err) => {
      logger.error("Lỗi phát âm thanh:", err);
      toast.error("Không thể phát âm thanh. Vui lòng kiểm tra lại liên kết.");
    });
  };


  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedSounds = sounds.map((s) => (s.ipa === editSound.ipa ? editSound : s));
      await publishIPASyllabus(updatedSounds);
      toast.success(`Đã lưu thay đổi cho âm /${editSound.ipa}/ thành công!`);
      onPublishSuccess(updatedSounds);
    } catch (err: unknown) {
      logger.error("Lỗi lưu thay đổi:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Lỗi hệ thống không thể lưu thay đổi: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditSound = (fields: Partial<IPASound>) => {
    setEditSound((prev) => ({ ...prev, ...fields }));
  };

  const updateExample = (index: number, fields: Partial<IPAExample>) => {
    setEditSound((prev) => {
      const updated = [...prev.examples];
      updated[index] = { ...updated[index], ...fields };
      return { ...prev, examples: updated };
    });
  };

  const hasFormChanges = JSON.stringify(selectedSound) !== JSON.stringify(editSound);

  return (
    <form onSubmit={handleSaveChanges} className={`${styles.formContainer} card`}>

      <div className={styles.rowHeader}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
          Chỉnh Sửa Âm: <span style={{ color: "rgb(var(--primary-rgb))" }}>/{editSound.ipa}/</span> ({editSound.name})
        </h3>
        <span className={styles.typeBadge}>
          Phân loại: {
            editSound.type === "monophthong_long" ? "Nguyên âm đơn dài" :
              editSound.type === "monophthong_short" ? "Nguyên âm đơn ngắn" :
                editSound.type === "diphthong" ? "Nguyên âm đôi" :
                  editSound.type === "consonant_voiceless" ? "Phụ âm vô thanh" : "Phụ âm hữu thanh"
          }
        </span>
      </div>

      {/* Hướng dẫn phát âm */}
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Cách đặt khẩu hình miệng & lưỡi</label>
        <textarea
          ref={descriptionRef}
          value={editSound.description}
          onChange={(e) => updateEditSound({ description: e.target.value })}
          rows={3}
          className={styles.textarea}
          style={{ resize: "none", overflowY: "hidden" }}
        />
      </div>

      {/* Tải lên ảnh và audio */}
      <div className={styles.gridTwoCols}>
        {/* Quản lý ảnh/video khẩu hình */}
        <div className={styles.inputGroup}>
          <IPAMediaManager
            mediaList={
              editSound.mouthShapeMedia && editSound.mouthShapeMedia.length > 0
                ? editSound.mouthShapeMedia
                : editSound.mouthShapeImage
                  ? [{ type: "image" as const, url: editSound.mouthShapeImage }]
                  : []
            }
            onChange={(newMedia) => {
              const firstImageUrl = newMedia.find((m) => m.type === "image")?.url || "";
              setEditSound((prev) => ({
                ...prev,
                mouthShapeMedia: newMedia,
                mouthShapeImage: firstImageUrl || prev.mouthShapeImage,
              }));
            }}
          />
        </div>

        {/* Audio âm mẫu */}
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Âm thanh phát âm mẫu (Nữ - Mặc định)</label>
          <input
            type="text"
            value={editSound.audioUrl || ""}
            onChange={(e) => updateEditSound({ audioUrl: e.target.value })}
            className={styles.inputText}
            placeholder="Đường dẫn âm thanh phát âm mẫu nữ (URL)"
          />
          <div className={styles.audioActionsRow}>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleUploadFile(e, "audios", "audioUrl")}
              className={styles.fileInput}
              style={{ margin: 0, flex: 1 }}
            />
            {editSound.audioUrl && (
              <button
                type="button"
                onClick={() => playAudio(editSound.audioUrl)}
                className="btn btn-outline"
                style={{ padding: "6px 10px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}
                title="Nghe thử âm thanh"
              >
                🔊 Nghe
              </button>
            )}
            <button
              type="button"
              disabled={generatingField === "audioUrl_female" || uploadingField === "audioUrl"}
              onClick={() => handleGenerateAIAudio(editSound.ipa, editSound.ipa, false, undefined, "female")}
              className={`${styles.aiGenBtn} btn btn-outline`}
            >
              {generatingField === "audioUrl_female" ? "⏳ Đang sinh..." : "Sinh giọng Nữ"}
            </button>
          </div>
          {uploadingField === "audioUrl" && <span className={styles.uploadStatus}>Đang tải âm thanh phát âm mẫu nữ lên...</span>}
          {generatingField === "audioUrl_female" && <span className={styles.uploadStatus}>Đang sinh giọng Nữ...</span>}

          <label className={styles.inputLabel} style={{ marginTop: "16px" }}>Âm thanh phát âm mẫu (Nam)</label>
          <input
            type="text"
            value={editSound.audioUrlMale || ""}
            onChange={(e) => updateEditSound({ audioUrlMale: e.target.value })}
            className={styles.inputText}
            placeholder="Đường dẫn âm thanh phát âm mẫu nam (URL)"
          />
          <div className={styles.audioActionsRow}>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleUploadFile(e, "audios", "audioUrlMale")}
              className={styles.fileInput}
              style={{ margin: 0, flex: 1 }}
            />
            {editSound.audioUrlMale && (
              <button
                type="button"
                onClick={() => playAudio(editSound.audioUrlMale)}
                className="btn btn-outline"
                style={{ padding: "6px 10px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}
                title="Nghe thử âm thanh"
              >
                🔊 Nghe
              </button>
            )}
            <button
              type="button"
              disabled={generatingField === "audioUrl_male" || uploadingField === "audioUrlMale"}
              onClick={() => handleGenerateAIAudio(editSound.ipa, editSound.ipa, false, undefined, "male")}
              className={`${styles.aiGenBtn} btn btn-outline`}
            >
              {generatingField === "audioUrl_male" ? "⏳ Đang sinh..." : "Sinh giọng Nam"}
            </button>
          </div>
          {uploadingField === "audioUrlMale" && <span className={styles.uploadStatus}>Đang tải âm thanh phát âm mẫu nam lên...</span>}
          {generatingField === "audioUrl_male" && <span className={styles.uploadStatus}>Đang sinh giọng Nam...</span>}
        </div>
      </div>

      {/* Lỗi thường gặp */}
      <div className={styles.mistakesContainer}>
        <div className={styles.sectionHeaderRow}>
          <label className={styles.inputLabel}>Lỗi thường gặp của người Việt</label>
          <button
            type="button"
            onClick={() => updateEditSound({ commonMistakes: [...editSound.commonMistakes, ""] })}
            className={styles.addBtn}
          >
            + Thêm lỗi mới
          </button>
        </div>
        {editSound.commonMistakes.map((mistake, idx) => (
          <div key={idx} className={styles.mistakeRow}>
            <input
              type="text"
              value={mistake}
              onChange={(e) => {
                const updated = [...editSound.commonMistakes];
                updated[idx] = e.target.value;
                updateEditSound({ commonMistakes: updated });
              }}
              className={styles.mistakeInput}
            />
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: "Xác nhận xóa lỗi",
                  message: "Bạn có chắc chắn muốn xóa lỗi thường gặp này không? Lỗi này sẽ bị loại bỏ khỏi danh sách của âm phát âm hiện tại.",
                  onConfirm: () => {
                    updateEditSound({ commonMistakes: editSound.commonMistakes.filter((_, i) => i !== idx) });
                  },
                });
              }}
              className={styles.deleteBtn}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      {/* Từ vựng, cụm từ & câu ví dụ */}
      <div className={styles.examplesContainer}>
        <div className={styles.sectionHeaderRow}>
          <label className={styles.inputLabel}>Danh sách ví dụ luyện phát âm</label>
          <button
            type="button"
            onClick={() => updateEditSound({
              examples: [
                ...editSound.examples,
                { word: "", partOfSpeech: "", ipa: "", meaning: "", audioUrl: "", type: activeExampleTab, hidden: false }
              ]
            })}
            className={styles.addBtn}
          >
            {activeExampleTab === "word" ? "+ Thêm từ vựng mới" :
              activeExampleTab === "phrase" ? "+ Thêm cụm từ mới" :
                "+ Thêm câu mẫu mới"}
          </button>
        </div>

        {/* Thanh chọn tab ngang cho ví dụ */}
        <div className={styles.subTabBar}>
          <button
            type="button"
            className={`${styles.subTabBtn} ${activeExampleTab === "word" ? styles.subTabActive : ""}`}
            onClick={() => setActiveExampleTab("word")}
          >
            Từ vựng ({editSound.examples.filter(e => !e.type || e.type === "word").length})
          </button>
          <button
            type="button"
            className={`${styles.subTabBtn} ${activeExampleTab === "phrase" ? styles.subTabActive : ""}`}
            onClick={() => setActiveExampleTab("phrase")}
          >
            Cụm từ ({editSound.examples.filter(e => e.type === "phrase").length})
          </button>
          <button
            type="button"
            className={`${styles.subTabBtn} ${activeExampleTab === "sentence" ? styles.subTabActive : ""}`}
            onClick={() => setActiveExampleTab("sentence")}
          >
            Câu mẫu ({editSound.examples.filter(e => e.type === "sentence").length})
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {editSound.examples
            .map((ex, originalIndex) => ({ ex, originalIndex }))
            .filter(({ ex }) => {
              if (activeExampleTab === "word") {
                return !ex.type || ex.type === "word";
              }
              return ex.type === activeExampleTab;
            })
            .map(({ ex, originalIndex }) => (
              <div
                key={originalIndex}
                className={styles.exampleCard}
                style={ex.hidden ? { opacity: 0.6, borderStyle: "dashed", backgroundColor: "rgba(var(--foreground-rgb), 0.02)" } : undefined}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  {ex.hidden ? (
                    <span style={{ fontSize: "0.75rem", background: "rgb(var(--foreground-rgb) / 0.05)", padding: "2px 6px", borderRadius: "4px", color: "rgb(var(--secondary-rgb))", fontWeight: 600 }}>
                      🔇 Đang ẩn với học viên
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", background: "rgb(16 185 129 / 0.1)", padding: "2px 6px", borderRadius: "4px", color: "rgb(16 185 129)", fontWeight: 600 }}>
                      👁️ Đang hiển thị
                    </span>
                  )}
                </div>

                <div className={styles.exampleGrid}>
                  <input
                    type="text"
                    value={ex.word}
                    placeholder={
                      activeExampleTab === "sentence" ? "Câu mẫu (Ví dụ: Nice to meet you.)" :
                        activeExampleTab === "phrase" ? "Cụm từ (Ví dụ: meet you)" :
                          "Từ vựng (Ví dụ: meet)"
                    }
                    onChange={(e) => updateExample(originalIndex, { word: e.target.value })}
                    className={styles.exampleInput}
                  />
                  <input
                    type="text"
                    value={ex.partOfSpeech || ""}
                    placeholder="Từ loại (Ví dụ: adj, noun)"
                    onChange={(e) => updateExample(originalIndex, { partOfSpeech: e.target.value })}
                    className={styles.exampleInput}
                  />
                  <input
                    type="text"
                    value={ex.ipa}
                    placeholder="Phiên âm IPA (Ví dụ: /miːt/)"
                    onChange={(e) => updateExample(originalIndex, { ipa: e.target.value })}
                    className={styles.exampleInput}
                  />
                  <input
                    type="text"
                    value={ex.meaning}
                    placeholder="Dịch nghĩa (Ví dụ: gặp gỡ)"
                    onChange={(e) => updateExample(originalIndex, { meaning: e.target.value })}
                    className={styles.exampleInput}
                  />
                </div>

                {/* Giọng Nữ */}
                <div className={styles.exampleRowFooter} style={{ marginTop: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", minWidth: "80px" }}>👩‍💼 Giọng Nữ:</span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={ex.audioUrl || ""}
                      placeholder="Đường dẫn âm thanh nữ (URL)"
                      onChange={(e) => updateExample(originalIndex, { audioUrl: e.target.value })}
                      className={styles.exampleInputUrl}
                    />
                  </div>
                  <div className={styles.audioActionsRow} style={{ flexShrink: 0 }}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "examples", "exampleAudio", originalIndex)}
                      className={styles.exampleFileInput}
                      style={{ margin: 0 }}
                    />
                    {ex.audioUrl && (
                      <button
                        type="button"
                        onClick={() => playAudio(ex.audioUrl)}
                        className="btn btn-outline"
                        style={{ padding: "6px 10px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}
                        title="Nghe thử âm thanh"
                      >
                        🔊 Nghe
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        generatingField === `exampleAudio_female_${originalIndex}` ||
                        uploadingField === `exampleAudio_${originalIndex}`
                      }
                      onClick={() => handleGenerateAIAudio(ex.word, undefined, true, originalIndex, "female")}
                      className={`${styles.aiGenBtn} btn btn-outline`}
                    >
                      {generatingField === `exampleAudio_female_${originalIndex}` ? "⏳ Đang sinh..." : "Sinh giọng Nữ"}
                    </button>
                  </div>
                </div>
                {uploadingField === `exampleAudio_${originalIndex}` && <span className={styles.uploadStatus}>Đang tải âm thanh nữ lên...</span>}
                {generatingField === `exampleAudio_female_${originalIndex}` && <span className={styles.uploadStatus}>Đang sinh giọng Nữ...</span>}

                {/* Giọng Nam */}
                <div className={styles.exampleRowFooter} style={{ marginTop: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", minWidth: "80px" }}>👨‍💼 Giọng Nam:</span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={ex.audioUrlMale || ""}
                      placeholder="Đường dẫn âm thanh nam (URL)"
                      onChange={(e) => updateExample(originalIndex, { audioUrlMale: e.target.value })}
                      className={styles.exampleInputUrl}
                    />
                  </div>
                  <div className={styles.audioActionsRow} style={{ flexShrink: 0 }}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "examples", "exampleAudioMale", originalIndex)}
                      className={styles.exampleFileInput}
                      style={{ margin: 0 }}
                    />
                    {ex.audioUrlMale && (
                      <button
                        type="button"
                        onClick={() => playAudio(ex.audioUrlMale)}
                        className="btn btn-outline"
                        style={{ padding: "6px 10px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}
                        title="Nghe thử âm thanh"
                      >
                        🔊 Nghe
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        generatingField === `exampleAudio_male_${originalIndex}` ||
                        uploadingField === `exampleAudioMale_${originalIndex}`
                      }
                      onClick={() => handleGenerateAIAudio(ex.word, undefined, true, originalIndex, "male")}
                      className={`${styles.aiGenBtn} btn btn-outline`}
                    >
                      {generatingField === `exampleAudio_male_${originalIndex}` ? "⏳ Đang sinh..." : "Sinh giọng Nam"}
                    </button>
                  </div>
                </div>
                {uploadingField === `exampleAudioMale_${originalIndex}` && <span className={styles.uploadStatus}>Đang tải âm thanh nam lên...</span>}
                {generatingField === `exampleAudio_male_${originalIndex}` && <span className={styles.uploadStatus}>Đang sinh giọng Nam...</span>}

                {/* Hàng điều khiển nút bấm */}
                <div className={styles.exampleRowControls} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid rgb(var(--card-border-rgb))", paddingTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => updateExample(originalIndex, { hidden: !ex.hidden })}
                    className={styles.exampleHideBtn}
                  >
                    {ex.hidden ? "Hiện ví dụ" : "Ẩn ví dụ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const typeText = activeExampleTab === "sentence" ? "câu" : activeExampleTab === "phrase" ? "cụm từ" : "từ";
                      const itemText = ex.word ? `${typeText} "${ex.word}"` : "ví dụ này";
                      setConfirmModal({
                        isOpen: true,
                        title: "Xác nhận xóa ví dụ",
                        message: `Bạn có chắc chắn muốn xóa ${itemText} khỏi danh sách thực hành không?`,
                        onConfirm: () => {
                          updateEditSound({ examples: editSound.examples.filter((_, i) => i !== originalIndex) });
                        },
                      });
                    }}
                    className={styles.exampleDeleteBtn}
                  >
                    Xóa ví dụ
                  </button>
                </div>
              </div>
            ))
          }
          {editSound.examples.filter(e => activeExampleTab === "word" ? (!e.type || e.type === "word") : e.type === activeExampleTab).length === 0 && (
            <p style={{ textAlign: "center", color: "rgb(var(--secondary-rgb))", fontSize: "0.85rem", padding: "20px 0", border: "1px dashed rgb(var(--card-border-rgb))", borderRadius: "8px" }}>
              {activeExampleTab === "word" ? "Chưa có từ vựng nào cho phần này." :
                activeExampleTab === "phrase" ? "Chưa có cụm từ nào cho phần này." :
                  "Chưa có câu mẫu nào cho phần này."}
            </p>
          )}
        </div>
        
        {/* Nút thêm nhanh ở cuối danh sách */}
        <button
          type="button"
          onClick={() => updateEditSound({
            examples: [
              ...editSound.examples,
              { word: "", partOfSpeech: "", ipa: "", meaning: "", audioUrl: "", type: activeExampleTab, hidden: false }
            ]
          })}
          className={styles.bottomAddBtn}
        >
          {activeExampleTab === "word" ? "+ Thêm từ vựng mới" :
            activeExampleTab === "phrase" ? "+ Thêm cụm từ mới" :
              "+ Thêm câu mẫu mới"}
        </button>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSaving || !hasFormChanges}
        className={`${styles.submitBtn} btn ${hasFormChanges && !isSaving ? "btn-primary" : "btn-outline"}`}
        style={{
          opacity: hasFormChanges && !isSaving ? 1 : 0.5,
          cursor: hasFormChanges && !isSaving ? "pointer" : "not-allowed",
        }}
      >
        {isSaving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
      </button>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-container"
            style={{
              backgroundColor: "rgb(var(--card-bg-rgb))",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "var(--shadow-premium)",
              border: "1px solid rgb(var(--card-border-rgb))",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "rgb(239, 68, 68)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--foreground-rgb)" }}>
                  {confirmModal.title}
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", lineHeight: "1.4" }}>
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn btn-outline"
                style={{ padding: "8px 16px", fontSize: "0.8rem", height: "36px" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                }}
                className="btn"
                style={{
                  padding: "8px 16px",
                  fontSize: "0.8rem",
                  backgroundColor: "rgb(239, 68, 68)",
                  color: "#ffffff",
                  border: "none",
                  height: "36px"
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
