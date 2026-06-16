import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage, db } from "@/lib/firebase/config";
import { IPASound, IPASyllabusSchema } from "@/types/pronunciation";
import { doc, setDoc } from "firebase/firestore";

/**
 * Lấy danh sách 44 âm IPA từ Firebase Storage.
 * Nếu chưa có hoặc xảy ra lỗi, tải tệp mặc định từ `/data/default_ipa.json`.
 */
export async function fetchIPASyllabus(): Promise<IPASound[]> {
  try {
    const fileRef = ref(storage, "syllabuses/pronunciation_ipa.json");
    const downloadUrl = await getDownloadURL(fileRef);
    const res = await fetch(downloadUrl);
    const rawData = await res.json();
    
    // Validate dữ liệu bằng Zod Schema để tránh app crash khi schema thay đổi đột ngột
    const parsed = IPASyllabusSchema.safeParse(rawData);
    if (parsed.success) {
      return parsed.data.sounds;
    } else {
      console.error("Lỗi cấu trúc dữ liệu syllabus từ Firebase Storage:", parsed.error.format());
    }
  } catch (storageError) {
    console.warn("Chưa có tệp trên Firebase Storage hoặc tải lỗi, đang tải tệp mặc định...", storageError);
  }

  // Fallback
  try {
    const res = await fetch("/data/default_ipa.json");
    const rawData = await res.json();
    
    // Validate dữ liệu tệp mặc định
    const parsed = IPASyllabusSchema.safeParse(rawData);
    if (parsed.success) {
      return parsed.data.sounds;
    } else {
      console.error("Lỗi cấu trúc dữ liệu syllabus mặc định:", parsed.error.format());
    }
  } catch (localError) {
    console.error("Lỗi tải tệp IPA mặc định:", localError);
  }

  return [];
}

/**
 * Xuất bản syllabus IPA mới (đóng gói dạng JSON) lên Firebase Storage.
 */
export async function publishIPASyllabus(sounds: IPASound[]): Promise<void> {
  const syllabus = {
    lastUpdated: new Date().toISOString(),
    version: Date.now(),
    sounds,
  };
  const jsonString = JSON.stringify(syllabus, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const fileRef = ref(storage, "syllabuses/pronunciation_ipa.json");
  await uploadBytes(fileRef, blob);
}

/**
 * Tải file đa phương tiện (ảnh khẩu hình, file âm thanh) lên Firebase Storage.
 * Trả về URL download trực tiếp.
 */
export async function uploadPronunciationMedia(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const fileRef = ref(storage, `pronunciation/${folder}/${fileName}`);
  const snapshot = await uploadBytes(fileRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Đồng bộ hóa các bản ghi âm luyện tập cục bộ của học sinh lên Firebase.
 * Tải từng tệp tin âm thanh lên Cloud Storage, sau đó gom toàn bộ link cập nhật Firestore một lần.
 */
export async function syncPracticeProgress(
  studentUid: string,
  itemsToSync: {
    exampleKey: string;
    audioBlob: Blob;
    spokenText: string;
    isCorrect: boolean;
    confidence: number;
    timestamp: number;
  }[]
): Promise<string[]> {
  if (itemsToSync.length === 0) return [];
  
  const syncedKeys: string[] = [];
  const updates: Record<string, unknown> = {};

  for (const item of itemsToSync) {
    try {
      // 1. Upload tệp ghi âm Blob lên Firebase Storage
      // Loại bỏ ký tự đặc biệt khỏi tên file để an toàn
      const safeKey = item.exampleKey.replace(/[./\\*?:"<>|]/g, "_");
      const fileRef = ref(storage, `users/${studentUid}/recordings/${safeKey}.webm`);
      
      const snapshot = await uploadBytes(fileRef, item.audioBlob);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // 2. Gom metadata đồng bộ cho Firestore
      // Thay thế dấu chấm trong tên trường để tránh lỗi nested object của Firestore
      const fieldKey = `recordings.${safeKey}`;
      updates[fieldKey] = {
        spokenText: item.spokenText,
        isCorrect: item.isCorrect,
        confidence: item.confidence,
        audioUrl: downloadUrl,
        timestamp: item.timestamp,
      };

      syncedKeys.push(item.exampleKey);
    } catch (err) {
      console.error(`Lỗi tải lên file âm thanh cho ${item.exampleKey}:`, err);
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      // 3. Cập nhật 1 lần duy nhất vào Firestore
      const docRef = doc(db, "ipa_progress", studentUid);
      await setDoc(docRef, updates, { merge: true });
    } catch (dbErr) {
      console.error("Lỗi cập nhật tiến trình vào Firestore:", dbErr);
      throw dbErr;
    }
  }

  return syncedKeys;
}

