import { useState, useEffect, useRef } from "react";
import { saveLocalPractice } from "@/utils/localPracticeDb";
import { doubleMetaphone } from "double-metaphone";
import { HOMOPHONES_MAP } from "@/utils/homophones";

export interface WordMatchResult {
  text: string;
  isCorrect: boolean;
  spoken?: string;
}

export interface SpeechPracticeResult {
  word: string;
  spokenText: string;
  isCorrect: boolean;
  confidence: number;
  accuracy?: number;
  wordResults?: WordMatchResult[];
}

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [listeningWord, setListeningWord] = useState<string | null>(null);
  const [practiceResult, setPracticeResult] = useState<SpeechPracticeResult | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [savedPracticeKey, setSavedPracticeKey] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const latestResultRef = useRef<SpeechPracticeResult | null>(null);
  
  // Lưu tham chiếu persistent để tránh bị garbage collector thu hồi trên Mobile (Chrome Android / iOS Safari)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const supported = !!SpeechRecognition;
      setTimeout(() => {
        setIsSupported(supported);
      }, 0);
    }
  }, []);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startSpeechPractice = async (wordToPractice: string, soundIpa: string, exampleType: string) => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionError("Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy sử dụng Safari (nếu dùng iPhone) hoặc Google Chrome (nếu dùng Android/PC).");
      setTimeout(() => setRecognitionError(null), 5000);
      return;
    }

    // Nếu đang nghe, hủy session cũ trước khi bắt đầu session mới
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Lỗi khi hủy session cũ:", e);
      }
      recognitionRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPracticeResult(null);
    setRecognitionError(null);
    setSavedPracticeKey(null);
    audioChunksRef.current = [];
    latestResultRef.current = null;

    try {
      const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Chỉ khởi chạy MediaRecorder trên Desktop để tránh xung đột phần cứng Micro trên thiết bị di động
      if (!isMobile) {
        // Kiểm tra môi trường an toàn HTTPS (bắt buộc cho getUserMedia trên PC)
        if (typeof window !== "undefined" && !window.isSecureContext) {
          throw new Error("NOT_SECURE_CONTEXT");
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("NOT_SECURE_CONTEXT");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Tự động phát hiện mimeType được hỗ trợ (iOS không hỗ trợ audio/webm, chỉ hỗ trợ audio/mp4 hoặc audio/aac)
        let selectedMimeType = "audio/webm";
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
          if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
            if (MediaRecorder.isTypeSupported("audio/mp4")) {
              selectedMimeType = "audio/mp4";
            } else if (MediaRecorder.isTypeSupported("audio/aac")) {
              selectedMimeType = "audio/aac";
            } else {
              selectedMimeType = ""; // Trình duyệt tự chọn định dạng mặc định
            }
          }
        }

        const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
        const mediaRecorder = new MediaRecorder(stream, recorderOptions);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const finalMimeType = selectedMimeType || mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
          
          // Nếu nhận dạng giọng nói thành công và có kết quả chấm điểm, lưu cục bộ
          if (latestResultRef.current) {
            const exampleKey = `${soundIpa}_${exampleType}_${wordToPractice}`;
            try {
              await saveLocalPractice(exampleKey, audioBlob, latestResultRef.current);
              setSavedPracticeKey(exampleKey);
            } catch (dbErr) {
              console.error("Lỗi lưu file ghi âm cục bộ:", dbErr);
            }
          }

          // Giải phóng các track microphone
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
        };
      }

      // Khởi tạo và cấu hình bộ nhận dạng giọng nói
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition; // Giữ tham chiếu mạnh
      
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Hủy sau 10 giây nếu không phản hồi để tránh đơ giao diện
      timeoutRef.current = setTimeout(() => {
        console.warn("Safety timeout reached for SpeechRecognition.");
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }
        setIsListening(false);
        setListeningWord(null);
        setRecognitionError("Không phát hiện giọng nói hoặc kết nối mạng yếu. Hãy thử nói to và rõ ràng hơn.");
        setTimeout(() => setRecognitionError(null), 5000);
      }, 10000);

      recognition.onstart = () => {
        setIsListening(true);
        setListeningWord(wordToPractice);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
          mediaRecorderRef.current.start();
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        // Tách từ để so khớp nâng cao (word alignment)
        const targetWords = wordToPractice.trim().split(/\s+/);
        const spokenWords = transcript.trim().split(/\s+/);

        const wordResults = alignWords(targetWords, spokenWords);
        const correctCount = wordResults.filter(w => w.isCorrect).length;
        const accuracy = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;

        // Cho phép dung sai: với câu/cụm từ thì chỉ cần đúng từ 80% trở lên
        const isPhraseOrSentence = targetWords.length > 1;
        const isCorrect = isPhraseOrSentence ? accuracy >= 80 : accuracy === 100;

        const newResult = {
          word: wordToPractice,
          spokenText: transcript,
          isCorrect,
          confidence: Math.round(confidence * 100),
          accuracy,
          wordResults,
        };

        latestResultRef.current = newResult;
        setPracticeResult(newResult);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        console.error("Lỗi nhận dạng giọng nói:", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Vui lòng cấp quyền truy cập Micro để luyện đọc.");
        } else if (event.error === "no-speech") {
          setRecognitionError("Không nghe thấy âm thanh. Hãy nói to, rõ ràng hơn.");
        } else {
          setRecognitionError("Không thể nhận dạng. Hãy kiểm tra kết nối mạng và thử lại.");
        }
        setTimeout(() => setRecognitionError(null), 5000);
      };

      recognition.onend = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsListening(false);
        setListeningWord(null);
        recognitionRef.current = null;
        
        // Dừng ghi âm khi SpeechRecognition kết thúc
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      };

      recognition.start();

    } catch (err: unknown) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error("Lỗi truy cập micro để ghi âm:", err);
      const errorMessage = err instanceof Error ? err.message : "";
      const errorName = err instanceof Error ? err.name : "";

      if (errorMessage === "NOT_SECURE_CONTEXT") {
        setRecognitionError("Để ghi âm trên điện thoại, bạn bắt buộc phải dùng kết nối HTTPS bảo mật.");
      } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setRecognitionError("Vui lòng cấp quyền truy cập Micro trên điện thoại để luyện đọc.");
      } else {
        setRecognitionError("Không thể kết nối Micro. Hãy kiểm tra cài đặt thiết bị.");
      }
      setTimeout(() => setRecognitionError(null), 5000);
      setIsListening(false);
      setListeningWord(null);
      recognitionRef.current = null;
    }
  };

  return {
    isSupported,
    isListening,
    listeningWord,
    practiceResult,
    recognitionError,
    savedPracticeKey,
    startSpeechPractice,
    setPracticeResult,
  };
}

// ==========================================
// Các hàm trợ giúp xử lý so khớp và thuật toán Sequence Alignment
// ==========================================

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // thay thế
          matrix[i][j - 1] + 1,     // chèn
          matrix[i - 1][j] + 1      // xóa
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim();
}

function areWordsSimilar(w1: string, w2: string): boolean {
  const clean1 = cleanWord(w1);
  const clean2 = cleanWord(w2);
  
  // 1. Trùng khớp hoàn toàn về chữ viết
  if (clean1 === clean2) return true;
  
  // 2. Kiểm tra từ đồng âm (Homophones) bằng danh sách đối chiếu chính xác
  if (HOMOPHONES_MAP[clean1]?.includes(clean2) || HOMOPHONES_MAP[clean2]?.includes(clean1)) {
    return true;
  }

  // 3. Sử dụng Double Metaphone để xử lý các biến thể chính tả (Ví dụ: color vs colour)
  // và các lỗi phát âm nhỏ của các từ dài (> 4 ký tự) để tránh nhận diện nhầm nguyên âm ngắn/dài (như ship vs sheep)
  try {
    const code1 = doubleMetaphone(clean1);
    const code2 = doubleMetaphone(clean2);
    
    const primaryMatch = code1[0] && code2[0] && code1[0] === code2[0];
    
    if (primaryMatch) {
      // Chỉ cho phép trùng mã Metaphone trực tiếp nếu độ dài từ > 4 ký tự
      // để tránh việc nhận diện nhầm các từ ngắn tương phản nguyên âm (như ship/sheep, bit/beat, bad/bed)
      if (clean1.length > 4 && clean2.length > 4) {
        return true;
      }
    }
  } catch {
    // Bỏ qua lỗi nếu có
  }

  // 4. Kiểm tra Levenshtein thô (như cũ) để bắt các lỗi gõ hoặc biến thể nhỏ khác
  if (clean1.length <= 3 || clean2.length <= 3) return clean1 === clean2;
  const distance = getLevenshteinDistance(clean1, clean2);
  const maxAllowedDistance = clean1.length <= 6 ? 1 : 2;
  return distance <= maxAllowedDistance;
}

export function alignWords(targetWords: string[], spokenWords: string[]): WordMatchResult[] {
  const n = targetWords.length;
  const m = spokenWords.length;
  
  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (areWordsSimilar(targetWords[i - 1], spokenWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // Thay thế
          dp[i - 1][j] + 1,     // Xóa (học sinh bỏ sót từ trong câu mục tiêu)
          dp[i][j - 1] + 1      // Chèn (học sinh nói thừa từ bên ngoài)
        );
      }
    }
  }
  
  const result: WordMatchResult[] = [];
  let i = n;
  let j = m;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && areWordsSimilar(targetWords[i - 1], spokenWords[j - 1])) {
      result.unshift({
        text: targetWords[i - 1],
        isCorrect: true,
        spoken: spokenWords[j - 1]
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      result.unshift({
        text: targetWords[i - 1],
        isCorrect: false,
        spoken: spokenWords[j - 1]
      });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
      result.unshift({
        text: targetWords[i - 1],
        isCorrect: false
      });
      i--;
    } else {
      // Bỏ qua từ nói thừa trong danh sách mục tiêu
      j--;
    }
  }
  
  return result;
}

