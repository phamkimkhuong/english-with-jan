import { useState } from "react";

export interface SpeechPracticeResult {
  word: string;
  spokenText: string;
  isCorrect: boolean;
  confidence: number;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [listeningWord, setListeningWord] = useState<string | null>(null);
  const [practiceResult, setPracticeResult] = useState<SpeechPracticeResult | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const startSpeechPractice = (wordToPractice: string) => {
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

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setListeningWord(wordToPractice);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      const cleanedSpoken = transcript.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
      const cleanedTarget = wordToPractice.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");

      const isCorrect = cleanedSpoken === cleanedTarget;

      setPracticeResult({
        word: wordToPractice,
        spokenText: transcript,
        isCorrect,
        confidence: Math.round(confidence * 100),
      });
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
    };

    recognition.start();
  };

  return {
    isListening,
    listeningWord,
    practiceResult,
    recognitionError,
    startSpeechPractice,
    setPracticeResult,
  };
}
