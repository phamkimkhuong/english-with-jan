import { useState, useEffect, useRef } from "react";
import { saveLocalPractice } from "@/utils/localPracticeDb";
import { doubleMetaphone } from "double-metaphone";
import { HOMOPHONES_MAP } from "@/utils/homophones";
import {
  getSelfHostedSttApiUrl,
  SelfHostedSttError,
  type SelfHostedSttResponse,
  transcribeWithSelfHostedStt,
} from "@/services/selfHostedSttService";

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

interface UseSpeechRecognitionOptions {
  getIdToken?: () => Promise<string | null | undefined>;
}

const ERROR_VISIBLE_MS = 5000;
const DESKTOP_RECOGNITION_TIMEOUT_MS = 10000;
const MOBILE_MIN_RECORDING_MS = 800;
const MOBILE_PROGRESS_INTERVAL_MS = 200;

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSelfHostedSttMode, setIsSelfHostedSttMode] = useState(false);
  const [listeningWord, setListeningWord] = useState<string | null>(null);
  const [practiceResult, setPracticeResult] = useState<SpeechPracticeResult | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [savedPracticeKey, setSavedPracticeKey] = useState<string | null>(null);
  const [mobileRecordingMaxMs, setMobileRecordingMaxMs] = useState<number | null>(null);
  const [mobileRecordingRemainingMs, setMobileRecordingRemainingMs] = useState<number | null>(null);
  const [canStopMobileRecording, setCanStopMobileRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const latestResultRef = useRef<SpeechPracticeResult | null>(null);
  const optionsRef = useRef(options);
  const mobileRecordingStartedAtRef = useRef<number | null>(null);
  const discardCurrentRecordingRef = useRef(false);

  // Lưu tham chiếu persistent để tránh bị garbage collector thu hồi trên Mobile (Chrome Android / iOS Safari)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileMinStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = isMobileBrowser();
      const supported = isMobile
        ? isSelfHostedSttSupported()
        : !!getBrowserSpeechRecognition();
      setTimeout(() => {
        setIsSelfHostedSttMode(isMobile);
        setIsSupported(supported);
      }, 0);
    }
  }, []);

  const clearManagedTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (mobileStopTimeoutRef.current) {
      clearTimeout(mobileStopTimeoutRef.current);
      mobileStopTimeoutRef.current = null;
    }

    if (mobileMinStopTimeoutRef.current) {
      clearTimeout(mobileMinStopTimeoutRef.current);
      mobileMinStopTimeoutRef.current = null;
    }

    if (mobileProgressIntervalRef.current) {
      clearInterval(mobileProgressIntervalRef.current);
      mobileProgressIntervalRef.current = null;
    }
  };

  const showRecognitionError = (message: string) => {
    setRecognitionError(message);
    setTimeout(() => setRecognitionError(null), ERROR_VISIBLE_MS);
  };

  const resetMobileRecordingState = () => {
    mobileRecordingStartedAtRef.current = null;
    setMobileRecordingMaxMs(null);
    setMobileRecordingRemainingMs(null);
    setCanStopMobileRecording(false);
    setIsProcessingRecording(false);
  };

  const stopActiveMediaStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
  };

  const resetActiveSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Lỗi khi hủy session cũ:", e);
      }
      recognitionRef.current = null;
    }

    discardCurrentRecordingRef.current = true;
    clearManagedTimeouts();
    stopActiveMediaStream();
    resetMobileRecordingState();
  };

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      discardCurrentRecordingRef.current = true;
      clearManagedTimeouts();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopActiveMediaStream();
    };
  }, []);

  const startMobileRecordingProgress = (maxDurationMs: number) => {
    const startedAt = Date.now();
    mobileRecordingStartedAtRef.current = startedAt;
    setMobileRecordingMaxMs(maxDurationMs);
    setMobileRecordingRemainingMs(maxDurationMs);
    setCanStopMobileRecording(false);
    setIsProcessingRecording(false);

    mobileMinStopTimeoutRef.current = setTimeout(() => {
      setCanStopMobileRecording(true);
    }, MOBILE_MIN_RECORDING_MS);

    mobileProgressIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      setMobileRecordingRemainingMs(Math.max(0, maxDurationMs - elapsedMs));
    }, MOBILE_PROGRESS_INTERVAL_MS);
  };

  const stopSpeechPractice = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (isSelfHostedSttMode && !canStopMobileRecording) return;

    setIsProcessingRecording(true);
    setCanStopMobileRecording(false);
    setMobileRecordingRemainingMs(0);
    discardCurrentRecordingRef.current = false;

    try {
      recorder.stop();
    } catch (err) {
      console.error("Lỗi khi dừng ghi âm:", err);
      showRecognitionError("Không thể dừng bản thu. Hãy thử lại.");
      setIsProcessingRecording(false);
    }
  };

  const startMobileSelfHostedPractice = async (wordToPractice: string, soundIpa: string, exampleType: string) => {
    if (!getSelfHostedSttApiUrl()) {
      showRecognitionError("STT cho điện thoại chưa được cấu hình. Vui lòng kiểm tra NEXT_PUBLIC_STT_API_URL khi build web.");
      return;
    }

    if (!window.isSecureContext) {
      throw new Error("NOT_SECURE_CONTEXT");
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("MEDIA_RECORDER_UNSUPPORTED");
    }

    const getIdToken = optionsRef.current.getIdToken;
    if (!getIdToken) {
      showRecognitionError("Vui lòng đăng nhập lại để dùng chấm phát âm trên điện thoại.");
      return;
    }

    const idToken = await getIdToken();
    if (!idToken) {
      showRecognitionError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại rồi thử luyện đọc.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const selectedMimeType = getSupportedAudioMimeType();
    const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
    const mediaRecorder = new MediaRecorder(stream, recorderOptions);
    mediaRecorderRef.current = mediaRecorder;
    discardCurrentRecordingRef.current = false;

    await new Promise<void>((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        reject(new Error("MEDIA_RECORDER_ERROR"));
      };

      mediaRecorder.onstop = async () => {
        clearManagedTimeouts();

        const shouldDiscard = discardCurrentRecordingRef.current;
        discardCurrentRecordingRef.current = false;

        if (shouldDiscard) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          resetMobileRecordingState();
          setIsListening(false);
          setListeningWord(null);
          resolve();
          return;
        }

        setIsProcessingRecording(true);
        setCanStopMobileRecording(false);
        setMobileRecordingRemainingMs(0);

        try {
          const finalMimeType = selectedMimeType || mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });

          if (audioBlob.size === 0) {
            showRecognitionError("Không nhận được dữ liệu ghi âm. Hãy thử bấm lại và nói gần micro hơn.");
            resolve();
            return;
          }

          const sttResult = await transcribeWithSelfHostedStt(audioBlob, idToken);
          const transcript = sttResult.transcript.trim();

          if (!transcript) {
            showRecognitionError("Không nhận được giọng nói. Hãy thử nói to, rõ và gần micro hơn.");
            resolve();
            return;
          }

          const newResult = buildPracticeResult(
            wordToPractice,
            transcript,
            calculateSelfHostedConfidence(sttResult)
          );

          latestResultRef.current = newResult;
          setPracticeResult(newResult);

          const exampleKey = `${soundIpa}_${exampleType}_${wordToPractice}`;
          try {
            await saveLocalPractice(exampleKey, audioBlob, newResult);
            setSavedPracticeKey(exampleKey);
          } catch (dbErr) {
            console.error("Lỗi lưu file ghi âm cục bộ:", dbErr);
          }

          resolve();
        } catch (err) {
          reject(err);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          resetMobileRecordingState();
          setIsListening(false);
          setListeningWord(null);
        }
      };

      const maxDurationMs = getMobileRecordingDurationMs(wordToPractice, exampleType);
      startMobileRecordingProgress(maxDurationMs);
      setIsListening(true);
      setListeningWord(wordToPractice);
      mediaRecorder.start();

      mobileStopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          setIsProcessingRecording(true);
          setCanStopMobileRecording(false);
          setMobileRecordingRemainingMs(0);
          mediaRecorder.stop();
        }
      }, maxDurationMs);
    });
  };

  const startDesktopBrowserSpeechPractice = async (
    wordToPractice: string,
    soundIpa: string,
    exampleType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
  ) => {
    // Kiểm tra môi trường an toàn HTTPS (bắt buộc cho getUserMedia trên PC)
    if (!window.isSecureContext) {
      throw new Error("NOT_SECURE_CONTEXT");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("NOT_SECURE_CONTEXT");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const selectedMimeType = getDesktopAudioMimeType();
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
      showRecognitionError("Không phát hiện giọng nói hoặc kết nối mạng yếu. Hãy thử nói to và rõ ràng hơn.");
    }, DESKTOP_RECOGNITION_TIMEOUT_MS);

    recognition.onstart = () => {
      setIsListening(true);
      setListeningWord(wordToPractice);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
        mediaRecorderRef.current.start();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      clearManagedTimeouts();

      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      const newResult = buildPracticeResult(wordToPractice, transcript, Math.round(confidence * 100));

      latestResultRef.current = newResult;
      setPracticeResult(newResult);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      clearManagedTimeouts();

      console.error("Lỗi nhận dạng giọng nói:", event.error);
      if (event.error === "not-allowed") {
        showRecognitionError("Vui lòng cấp quyền truy cập Micro để luyện đọc.");
      } else if (event.error === "no-speech") {
        showRecognitionError("Không nghe thấy âm thanh. Hãy nói to, rõ ràng hơn.");
      } else {
        showRecognitionError("Không thể nhận dạng. Hãy kiểm tra kết nối mạng và thử lại.");
      }
    };

    recognition.onend = () => {
      clearManagedTimeouts();
      setIsListening(false);
      setListeningWord(null);
      recognitionRef.current = null;

      // Dừng ghi âm khi SpeechRecognition kết thúc
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };

    recognition.start();
  };

  const startSpeechPractice = async (wordToPractice: string, soundIpa: string, exampleType: string) => {
    if (typeof window === "undefined") return;

    const isMobile = isMobileBrowser();
    const SpeechRecognition = getBrowserSpeechRecognition();

    if (!isMobile && !SpeechRecognition) {
      showRecognitionError("Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy sử dụng Safari (nếu dùng iPhone) hoặc Google Chrome (nếu dùng Android/PC).");
      return;
    }

    resetActiveSession();

    setPracticeResult(null);
    setRecognitionError(null);
    setSavedPracticeKey(null);
    audioChunksRef.current = [];
    latestResultRef.current = null;

    try {
      if (isMobile) {
        await startMobileSelfHostedPractice(wordToPractice, soundIpa, exampleType);
        return;
      }

      await startDesktopBrowserSpeechPractice(wordToPractice, soundIpa, exampleType, SpeechRecognition);
    } catch (err: unknown) {
      clearManagedTimeouts();
      discardCurrentRecordingRef.current = true;
      stopActiveMediaStream();
      resetMobileRecordingState();
      console.error("Lỗi luyện phát âm:", err);

      if (err instanceof SelfHostedSttError) {
        showRecognitionError(getSelfHostedSttErrorMessage(err));
      } else {
        const errorMessage = err instanceof Error ? err.message : "";
        const errorName = err instanceof Error ? err.name : "";

        if (errorMessage === "NOT_SECURE_CONTEXT") {
          showRecognitionError("Để ghi âm trên điện thoại, bạn bắt buộc phải dùng kết nối HTTPS bảo mật.");
        } else if (errorMessage === "MEDIA_RECORDER_UNSUPPORTED") {
          showRecognitionError("Trình duyệt điện thoại này không hỗ trợ ghi âm trực tiếp. Hãy cập nhật trình duyệt hoặc thử Chrome/Safari bản mới.");
        } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          showRecognitionError("Vui lòng cấp quyền truy cập Micro trên điện thoại để luyện đọc.");
        } else {
          showRecognitionError("Không thể kết nối Micro hoặc máy chủ chấm phát âm. Hãy kiểm tra kết nối và thử lại.");
        }
      }

      setIsListening(false);
      setListeningWord(null);
      recognitionRef.current = null;
    }
  };

  return {
    isSupported,
    isListening,
    isSelfHostedSttMode,
    isProcessingRecording,
    canStopMobileRecording,
    mobileRecordingMaxMs,
    mobileRecordingRemainingMs,
    listeningWord,
    practiceResult,
    recognitionError,
    savedPracticeKey,
    startSpeechPractice,
    stopSpeechPractice,
    setPracticeResult,
  };
}

// ==========================================
// Các hàm trợ giúp xử lý so khớp và thuật toán Sequence Alignment
// ==========================================

function getBrowserSpeechRecognition() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
}

function isSelfHostedSttSupported(): boolean {
  if (typeof navigator === "undefined" || typeof MediaRecorder === "undefined") return false;
  return !!getSelfHostedSttApiUrl() && !!navigator.mediaDevices?.getUserMedia;
}

function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";

  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

function getDesktopAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";

  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/aac")) return "audio/aac";
  return "";
}

function getMobileRecordingDurationMs(textToPractice: string, exampleType: string): number {
  const wordCount = countSpeakableWords(textToPractice);

  if (exampleType === "word" || wordCount <= 1) {
    return 5000;
  }

  if (exampleType === "phrase") {
    return clampMs(3000 + wordCount * 800, 5000, 9000);
  }

  return clampMs(3500 + wordCount * 850, 7000, 15000);
}

function countSpeakableWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .map(cleanWord)
    .filter(Boolean).length;
}

function clampMs(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function calculateSelfHostedConfidence(sttResult: SelfHostedSttResponse): number {
  const validConfidences = sttResult.words
    .map((word) => word.conf)
    .filter((confidence) => Number.isFinite(confidence));

  if (validConfidences.length === 0) return 0;

  const average = validConfidences.reduce((sum, confidence) => sum + confidence, 0) / validConfidences.length;
  return Math.round(Math.max(0, Math.min(1, average)) * 100);
}

function getSelfHostedSttErrorMessage(error: SelfHostedSttError): string {
  if (error.status === 401 || error.status === 403) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử luyện đọc.";
  }

  if (error.status === 413) {
    return "Bản thu quá dài hoặc quá nặng. Hãy nói ngắn gọn hơn rồi thử lại.";
  }

  if (error.status === 429) {
    return "Bạn đang luyện quá nhanh. Hãy chờ vài giây rồi thử lại.";
  }

  return "Không gửi được bản thu tới máy chủ chấm phát âm. Hãy kiểm tra kết nối mạng và thử lại.";
}

function buildPracticeResult(wordToPractice: string, transcript: string, confidence: number): SpeechPracticeResult {
  // Tách từ để so khớp nâng cao (word alignment)
  const targetWords = wordToPractice.trim().split(/\s+/).filter(Boolean);
  const spokenWords = transcript.trim().split(/\s+/).filter(Boolean);

  const wordResults = alignWords(targetWords, spokenWords);
  const correctCount = wordResults.filter(w => w.isCorrect).length;
  const accuracy = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;

  // Cho phép dung sai: với câu/cụm từ thì chỉ cần đúng từ 80% trở lên
  const isPhraseOrSentence = targetWords.length > 1;
  const isCorrect = isPhraseOrSentence ? accuracy >= 80 : accuracy === 100;

  return {
    word: wordToPractice,
    spokenText: transcript,
    isCorrect,
    confidence,
    accuracy,
    wordResults,
  };
}

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
