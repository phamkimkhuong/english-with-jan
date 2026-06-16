import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IPASound } from "@/types/pronunciation";
import { fetchIPASyllabus } from "@/services/pronunciationService";

export function useIPASyllabus() {
  // Sử dụng TanStack Query để quản lý và cache dữ liệu từ Server/Firebase Storage
  const { data: sounds = [], isLoading: loading } = useQuery<IPASound[]>({
    queryKey: ["ipa-syllabus"],
    queryFn: fetchIPASyllabus,
  });

  const [selectedSoundIpa, setSelectedSoundIpa] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "vowels" | "consonants">("all");
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // Tính toán state phái sinh (Derived State) thay vì dùng useEffect để tránh set-state-in-effect warning
  const selectedSound = (selectedSoundIpa 
    ? sounds.find(s => s.ipa === selectedSoundIpa) 
    : sounds[0]) || null;

  const setSelectedSound = (sound: IPASound | null) => {
    setSelectedSoundIpa(sound ? sound.ipa : null);
  };

  const speakWithTTS = (text: string, isWord: boolean) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Dọn sạch âm thanh đang nói dở
    window.speechSynthesis.cancel();

    // Loại bỏ các ký tự gạch chéo cho IPA nếu muốn phát âm trực tiếp
    const cleanedText = text.replace(/\//g, "");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = "en-US";
    // Phát âm ký tự âm đơn lẻ chậm hơn (0.6), từ/cụm từ/câu thì bình thường (0.9)
    const isSingleSymbol = text.startsWith("/") && text.endsWith("/") && text.length <= 5;
    utterance.rate = isSingleSymbol ? 0.6 : 0.95;

    if (isWord) {
      setPlayingWord(text);
      utterance.onend = () => {
        setPlayingWord(null);
      };
      utterance.onerror = () => {
        setPlayingWord(null);
      };
    }

    window.speechSynthesis.speak(utterance);
  };

  const playSoundAudio = (textToSpeak: string, customAudioUrl: string, isWord = false) => {
    if (customAudioUrl) {
      if (isWord) {
        setPlayingWord(textToSpeak);
      }
      const audio = new Audio(customAudioUrl);
      
      audio.onended = () => {
        if (isWord) {
          setPlayingWord(null);
        }
      };
      
      audio.onerror = (err) => {
        console.warn("Lỗi phát file nghe, chuyển sang Text-to-Speech:", err);
        speakWithTTS(textToSpeak, isWord);
      };

      audio.play().catch((err) => {
        console.warn("Lỗi phát file nghe, chuyển sang Text-to-Speech:", err);
        speakWithTTS(textToSpeak, isWord);
      });
    } else {
      speakWithTTS(textToSpeak, isWord);
    }
  };

  return {
    sounds,
    selectedSound,
    setSelectedSound,
    loading,
    activeTab,
    setActiveTab,
    playingWord,
    playSoundAudio,
  };
}
