import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IPASound } from "@/types/pronunciation";
import { fetchIPASyllabus } from "@/services/pronunciationService";

export function useIPASyllabus() {
  // Sử dụng TanStack Query để quản lý và cache dữ liệu từ Server/Firebase Storage
  const { data: sounds = [], isLoading: loading } = useQuery<IPASound[]>({
    queryKey: ["ipa-syllabus"],
    queryFn: fetchIPASyllabus,
    staleTime: 5 * 60 * 1000, // Cache dữ liệu trong 5 phút để tránh gọi Firebase Storage liên tục
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

  const playSoundAudio = (textToSpeak: string, customAudioUrl: string, isWord = false) => {
    if (!customAudioUrl) return;

    if (isWord) {
      setPlayingWord(textToSpeak);
    }
    const audio = new Audio(customAudioUrl);
    
    audio.onended = () => {
      if (isWord) {
        setPlayingWord(null);
      }
    };
    
    audio.onerror = () => {
      if (isWord) {
        setPlayingWord(null);
      }
    };

    audio.play().catch((err) => {
      console.warn("Lỗi phát file âm thanh:", err);
      if (isWord) {
        setPlayingWord(null);
      }
    });
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
