import { SpeechPracticeResult } from "@/hooks/useSpeechRecognition";

const DB_NAME = "EnglishWithJanPractice";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

export interface LocalPracticeData {
  exampleKey: string; // soundIpa + "_" + type + "_" + word
  audioBlob: Blob;
  spokenText: string;
  isCorrect: boolean;
  confidence: number;
  timestamp: number;
  dirty: boolean;
}

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in browser environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "exampleKey" });
      }
    };
  });
}

/**
 * Lưu file ghi âm Blob và kết quả chấm điểm cục bộ.
 * Nếu có dữ liệu cũ sẽ tự động ghi đè bản mới nhất.
 */
export async function saveLocalPractice(
  exampleKey: string,
  audioBlob: Blob,
  result: SpeechPracticeResult
): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const record: LocalPracticeData = {
      exampleKey,
      audioBlob,
      spokenText: result.spokenText,
      isCorrect: result.isCorrect,
      confidence: result.confidence,
      timestamp: Date.now(),
      dirty: true, // Đánh dấu cần đồng bộ lên Cloud
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Lấy file Blob ghi âm cục bộ để học sinh nghe lại.
 */
export async function getLocalPractice(exampleKey: string): Promise<LocalPracticeData | null> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(exampleKey);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("IndexedDB error:", err);
    return null;
  }
}

/**
 * Lấy tất cả các bản thu âm chưa được đồng bộ (dirty === true) để phục vụ batch sync.
 */
export async function getUnsyncedPractices(): Promise<LocalPracticeData[]> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as LocalPracticeData[];
        resolve(all.filter((item) => item.dirty));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("IndexedDB error:", err);
    return [];
  }
}

/**
 * Đánh dấu bản thu âm đã đồng bộ thành công lên Cloud để không gửi lại nữa.
 */
export async function markPracticeSynced(exampleKey: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Lấy bản ghi hiện tại
    const getRequest = store.get(exampleKey);

    getRequest.onsuccess = () => {
      const record = getRequest.result as LocalPracticeData;
      if (record) {
        record.dirty = false;
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}
