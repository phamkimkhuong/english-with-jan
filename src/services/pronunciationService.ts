import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import { IPASound, IPASyllabusSchema } from "@/types/pronunciation";

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
