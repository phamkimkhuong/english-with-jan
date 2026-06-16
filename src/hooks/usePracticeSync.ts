import { useEffect, useRef, useState } from "react";
import { 
  getUnsyncedPractices, 
  markPracticeSynced
} from "@/utils/localPracticeDb";
import { syncPracticeProgress } from "@/services/pronunciationService";

export function usePracticeSync(studentUid: string | null, currentSoundIpa: string | null, savedPracticeKey: string | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const prevSoundIpaRef = useRef<string | null>(null);

  // Hàm thực hiện đồng bộ hóa tất cả các bản ghi âm chưa được đồng bộ (dirty)
  const triggerSync = async () => {
    if (!studentUid || isSyncing) return;

    try {
      const unsyncedItems = await getUnsyncedPractices();
      if (unsyncedItems.length === 0) return;

      setIsSyncing(true);

      // Đổi định dạng để phù hợp với hàm API syncPracticeProgress
      const itemsToSync = unsyncedItems.map((item) => ({
        exampleKey: item.exampleKey,
        audioBlob: item.audioBlob,
        spokenText: item.spokenText,
        isCorrect: item.isCorrect,
        confidence: item.confidence,
        timestamp: item.timestamp,
      }));

      // Gọi API tải lên Storage & lưu Firestore
      const syncedKeys = await syncPracticeProgress(studentUid, itemsToSync);

      // Đánh dấu đã đồng bộ thành công ở local IndexedDB
      for (const key of syncedKeys) {
        await markPracticeSynced(key);
      }

      if (syncedKeys.length > 0) {
        console.log(`[PracticeSync] Đồng bộ thành công ${syncedKeys.length} bản ghi âm.`);
      }
    } catch (err) {
      console.error("[PracticeSync] Lỗi đồng bộ hóa tiến trình:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Offline-First Recovery: Khởi chạy và đồng bộ các file dirty khi app load / user đăng nhập
  useEffect(() => {
    if (studentUid) {
      const timer = setTimeout(() => {
        triggerSync();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUid]);

  // 2. Tự động sync khi học viên chuyển sang âm IPA khác
  useEffect(() => {
    const handleSoundTransition = async () => {
      if (!studentUid) return;

      const prevSound = prevSoundIpaRef.current;
      if (prevSound && prevSound !== currentSoundIpa) {
        // Học viên vừa chuyển từ âm cũ sang âm mới -> Kích hoạt đồng bộ hóa
        console.log(`[PracticeSync] Phát hiện chuyển âm: /${prevSound}/ -> /${currentSoundIpa}/. Đang đồng bộ...`);
        await triggerSync();
      }
      
      prevSoundIpaRef.current = currentSoundIpa;
    };

    handleSoundTransition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSoundIpa, studentUid]);

  // 3. Tự động sync khi số lượng dirty vượt ngưỡng 10
  useEffect(() => {
    const checkThresholdAndSync = async () => {
      if (!studentUid || !savedPracticeKey) return;

      const unsynced = await getUnsyncedPractices();
      if (unsynced.length >= 10) {
        console.log(`[PracticeSync] Số lượng bản ghi chưa lưu đạt ngưỡng (${unsynced.length}). Đang đồng bộ...`);
        await triggerSync();
      }
    };

    checkThresholdAndSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPracticeKey, studentUid]);

  // 4. Cố gắng ghi lại dữ liệu trước khi thoát (tab close / refresh)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!studentUid) return;
      // Dù API bị giới hạn nhưng vẫn kích hoạt một request đồng bộ nhanh
      triggerSync();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUid]);

  return {
    isSyncing,
    triggerSync,
  };
}
