import React, { useState } from "react";
import { IPASound, IPAExample } from "@/types/pronunciation";
import { publishIPASyllabus, uploadPronunciationMedia } from "@/services/pronunciationService";
import { toast } from "@/hooks/useToastStore";
import { createLogger } from "@/utils/logger";
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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
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
      const url = await uploadPronunciationMedia(file, folder);

      setEditSound((prev) => {
        if (targetField === "mouthShapeImage") {
          return { ...prev, mouthShapeImage: url };
        } else if (targetField === "audioUrl") {
          return { ...prev, audioUrl: url };
        } else if (targetField === "exampleAudio" && exampleIndex !== undefined) {
          const updatedExamples = [...prev.examples];
          updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrl: url };
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
      toast.error("Lỗi hệ thống không thể lưu thay đổi. Vui lòng thử lại sau.");
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
          value={editSound.description}
          onChange={(e) => updateEditSound({ description: e.target.value })}
          rows={3}
          className={styles.textarea}
        />
      </div>

      {/* Tải lên ảnh và audio */}
      <div className={styles.gridTwoCols}>
        {/* Ảnh khẩu hình */}
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Ảnh khẩu hình miệng</label>
          <input
            type="text"
            value={editSound.mouthShapeImage}
            onChange={(e) => updateEditSound({ mouthShapeImage: e.target.value })}
            className={styles.inputText}
            placeholder="Đường dẫn ảnh khẩu hình miệng (URL)"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUploadFile(e, "images", "mouthShapeImage")}
            className={styles.fileInput}
          />
          {uploadingField === "mouthShapeImage" && <span className={styles.uploadStatus}>Đang tải ảnh khẩu hình miệng lên...</span>}
        </div>

        {/* Audio âm mẫu */}
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Âm thanh phát âm mẫu</label>
          <input
            type="text"
            value={editSound.audioUrl}
            onChange={(e) => updateEditSound({ audioUrl: e.target.value })}
            className={styles.inputText}
            placeholder="Đường dẫn âm thanh phát âm mẫu (URL)"
          />
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleUploadFile(e, "audios", "audioUrl")}
            className={styles.fileInput}
          />
          {uploadingField === "audioUrl" && <span className={styles.uploadStatus}>Đang tải âm thanh phát âm mẫu lên...</span>}
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

      {/* Từ vựng ví dụ */}
      <div className={styles.examplesContainer}>
        <div className={styles.sectionHeaderRow}>
          <label className={styles.inputLabel}>Danh sách từ vựng ví dụ thực hành</label>
          <button
            type="button"
            onClick={() => updateEditSound({ examples: [...editSound.examples, { word: "", ipa: "", meaning: "", audioUrl: "" }] })}
            className={styles.addBtn}
          >
            + Thêm từ ví dụ mới
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {editSound.examples.map((ex, idx) => (
            <div key={idx} className={styles.exampleCard}>
              <div className={styles.exampleGrid}>
                <input
                  type="text"
                  value={ex.word}
                  placeholder="Từ (Ví dụ: meet)"
                  onChange={(e) => updateExample(idx, { word: e.target.value })}
                  className={styles.exampleInput}
                />
                <input
                  type="text"
                  value={ex.ipa}
                  placeholder="Phiên âm IPA (Ví dụ: /miːt/)"
                  onChange={(e) => updateExample(idx, { ipa: e.target.value })}
                  className={styles.exampleInput}
                />
                <input
                  type="text"
                  value={ex.meaning}
                  placeholder="Nghĩa của từ (Ví dụ: gặp gỡ)"
                  onChange={(e) => updateExample(idx, { meaning: e.target.value })}
                  className={styles.exampleInput}
                />
              </div>

              <div className={styles.exampleRowFooter}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={ex.audioUrl}
                    placeholder="Đường dẫn âm thanh (URL)"
                    onChange={(e) => updateExample(idx, { audioUrl: e.target.value })}
                    className={styles.exampleInputUrl}
                  />
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleUploadFile(e, "examples", "exampleAudio", idx)}
                  className={styles.exampleFileInput}
                />
                <button
                  type="button"
                  onClick={() => {
                    const wordText = ex.word ? `từ "${ex.word}"` : "từ ví dụ này";
                    setConfirmModal({
                      isOpen: true,
                      title: "Xác nhận xóa từ vựng",
                      message: `Bạn có chắc chắn muốn xóa ${wordText} khỏi danh sách từ vựng thực hành không?`,
                      onConfirm: () => {
                        updateEditSound({ examples: editSound.examples.filter((_, i) => i !== idx) });
                      },
                    });
                  }}
                  className={styles.exampleDeleteBtn}
                >
                  Xóa từ
                </button>
              </div>
              {uploadingField === `exampleAudio_${idx}` && <span className={styles.uploadStatus}>Đang tải âm thanh của từ lên...</span>}
            </div>
          ))}
        </div>
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
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
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
