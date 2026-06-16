import { useState, useEffect, useRef } from "react";
import { saveLocalPractice } from "@/utils/localPracticeDb";

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

  const startSpeechPractice = async (wordToPractice: string, soundIpa: string, exampleType: string) => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionError("Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy dùng Google Chrome hoặc Microsoft Edge.");
      setTimeout(() => setRecognitionError(null), 5000);
      return;
    }

    if (isListening) {
      return;
    }

    setPracticeResult(null);
    setRecognitionError(null);
    setSavedPracticeKey(null);
    audioChunksRef.current = [];
    latestResultRef.current = null;

    try {
      // 1. Yêu cầu quyền Micro và lấy stream âm thanh
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Khởi tạo MediaRecorder để ghi âm
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // 3. Nếu nhận dạng giọng nói thành công và có kết quả chấm điểm, lưu cục bộ
        if (latestResultRef.current) {
          const exampleKey = `${soundIpa}_${exampleType}_${wordToPractice}`;
          try {
            await saveLocalPractice(exampleKey, audioBlob, latestResultRef.current);
            setSavedPracticeKey(exampleKey);
          } catch (dbErr) {
            console.error("Lỗi lưu file ghi âm cục bộ:", dbErr);
          }
        }

        // 4. Giải phóng các track microphone
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      // 5. Khởi tạo và cấu hình bộ nhận dạng giọng nói
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setListeningWord(wordToPractice);
        mediaRecorder.start();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
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
        console.error("Lỗi nhận dạng giọng nói:", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Vui lòng cấp quyền truy cập Micro để luyện đọc.");
        } else {
          setRecognitionError("Không thể nhận dạng. Hãy nói to, rõ ràng hơn.");
        }
        setTimeout(() => setRecognitionError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setListeningWord(null);
        
        // Dừng ghi âm khi SpeechRecognition kết thúc
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      };

      recognition.start();

    } catch (err) {
      console.error("Lỗi truy cập micro để ghi âm:", err);
      setRecognitionError("Không thể truy cập Micro. Vui lòng kiểm tra quyền thiết bị.");
      setTimeout(() => setRecognitionError(null), 4000);
      setIsListening(false);
      setListeningWord(null);
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
  if (clean1 === clean2) return true;
  if (clean1.length <= 3 || clean2.length <= 3) return clean1 === clean2;
  
  const distance = getLevenshteinDistance(clean1, clean2);
  // Từ ngắn (4-6 chữ) cho phép lệch 1 ký tự, từ dài hơn cho phép lệch tối đa 2 ký tự
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

