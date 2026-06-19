import React, { useState } from "react";
import { IPAMedia } from "@/types/pronunciation";
import { uploadPronunciationMedia } from "@/services/pronunciationService";
import { toast } from "@/hooks/useToastStore";
import styles from "./adminPronunciation.module.css";

interface IPAMediaManagerProps {
  mediaList: IPAMedia[];
  onChange: (newMedia: IPAMedia[]) => void;
}

export const IPAMediaManager: React.FC<IPAMediaManagerProps> = ({
  mediaList,
  onChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "video" | null>(null);

  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadType(type);

    try {
      const folder = type === "image" ? "images" : "videos";
      const url = await uploadPronunciationMedia(file, folder);
      
      const newMediaItem: IPAMedia = { type, url };
      onChange([...mediaList, newMediaItem]);
      
      toast.success(`Tải lên ${type === "image" ? "hình ảnh" : "video"} khẩu hình thành công!`);
    } catch (err) {
      console.error("Lỗi tải lên media khẩu hình:", err);
      toast.error("Không thể tải tệp lên. Vui lòng kiểm tra lại kết nối hoặc định dạng tệp.");
    } finally {
      setIsUploading(false);
      setUploadType(null);
      // Reset input value to allow selecting the same file again if needed
      e.target.value = "";
    }
  };

  const handleRemoveMedia = (indexToRemove: number) => {
    const updated = mediaList.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    toast.success("Đã xóa tài nguyên khỏi danh sách.");
  };

  const handleMoveMedia = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === mediaList.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...mediaList];
    
    // Swap items
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    onChange(updated);
  };

  return (
    <div className={styles.mediaManagerContainer}>
      <label className={styles.inputLabel}>
        Hình ảnh & Video hướng dẫn khẩu hình miệng
      </label>

      {/* Grid danh sách các media hiện tại */}
      {mediaList.length > 0 ? (
        <div className={styles.mediaGrid}>
          {mediaList.map((media, idx) => (
            <div key={idx} className={styles.mediaCard}>
              <div className={styles.mediaPreviewBox}>
                {media.type === "video" ? (
                  <video
                    src={media.url}
                    className={styles.mediaPreview}
                    muted
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.url}
                    alt={`Khẩu hình ${idx + 1}`}
                    className={styles.mediaPreview}
                  />
                )}
                <span
                  className={`${styles.mediaBadge} ${
                    media.type === "video" ? styles.badgeVideo : styles.badgeImage
                  }`}
                >
                  {media.type === "video" ? "Video" : "Ảnh"}
                </span>
              </div>

              {/* Bộ điều khiển thứ tự và xóa */}
              <div className={styles.mediaControls}>
                <div className={styles.orderControls}>
                  <button
                    type="button"
                    onClick={() => handleMoveMedia(idx, "up")}
                    disabled={idx === 0}
                    className={styles.controlBtn}
                    title="Di chuyển lên"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMedia(idx, "down")}
                    disabled={idx === mediaList.length - 1}
                    className={styles.controlBtn}
                    title="Di chuyển xuống"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(idx)}
                  className={styles.mediaDeleteBtn}
                  title="Xóa tài nguyên"
                >
                  ✕ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyMediaText}>
          Chưa có hình ảnh hay video khẩu hình miệng nào. Hãy thêm ở dưới.
        </p>
      )}

      {/* Khu vực tải lên hình ảnh/video mới */}
      <div className={styles.uploadActions}>
        {/* Nút tải ảnh */}
        <label className={`${styles.uploadBtn} ${isUploading ? styles.uploadBtnDisabled : ""}`}>
          <input
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={(e) => handleUploadFile(e, "image")}
            style={{ display: "none" }}
          />
          🖼️ Thêm hình ảnh
        </label>

        {/* Nút tải video */}
        <label className={`${styles.uploadBtn} ${isUploading ? styles.uploadBtnDisabled : ""}`}>
          <input
            type="file"
            accept="video/*"
            disabled={isUploading}
            onChange={(e) => handleUploadFile(e, "video")}
            style={{ display: "none" }}
          />
          🎥 Thêm video
        </label>

        {isUploading && (
          <span className={styles.uploadSpinner}>
            ⏳ Đang tải {uploadType === "image" ? "ảnh" : "video"} lên Storage...
          </span>
        )}
      </div>
    </div>
  );
};
