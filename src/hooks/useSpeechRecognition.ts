import { useState, useEffect, useRef } from "react";
import { saveLocalPractice } from "@/utils/localPracticeDb";

export interface SpeechPracticeResult {
  word: string;
  spokenText: string;
  isCorrect: boolean;
  confidence: number;
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

        const cleanedSpoken = transcript.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
        const cleanedTarget = wordToPractice.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");

        const isCorrect = cleanedSpoken === cleanedTarget;

        const newResult = {
          word: wordToPractice,
          spokenText: transcript,
          isCorrect,
          confidence: Math.round(confidence * 100),
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

