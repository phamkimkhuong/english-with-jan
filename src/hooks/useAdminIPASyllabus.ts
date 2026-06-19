import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IPASound } from "@/types/pronunciation";
import { fetchIPASyllabus } from "@/services/pronunciationService";

export function useAdminIPASyllabus() {
  const queryClient = useQueryClient();

  // Sử dụng TanStack Query để tải và quản lý cache syllabus
  const { data: sounds = [], isLoading: loading } = useQuery<IPASound[]>({
    queryKey: ["ipa-syllabus"],
    queryFn: fetchIPASyllabus,
    staleTime: 5 * 60 * 1000, // Cache 5 phút tương tự để hạn chế request khi quản trị viên chuyển màn hình
  });

  const [selectedSoundIpa, setSelectedSoundIpa] = useState<string | null>(null);

  // Derived state: Tính toán selectedSound từ selectedSoundIpa, loại bỏ useEffect
  const selectedSound = (selectedSoundIpa 
    ? sounds.find(s => s.ipa === selectedSoundIpa) 
    : sounds[0]) || null;

  const selectSoundToEdit = (sound: IPASound) => {
    setSelectedSoundIpa(sound.ipa);
  };

  const handlePublishSuccess = (updatedSounds: IPASound[]) => {
    // Cập nhật đè dữ liệu cache trong React Query để UI học sinh/quản trị đều nhận giá trị mới tức thì
    queryClient.setQueryData(["ipa-syllabus"], updatedSounds);
  };

  return {
    sounds,
    selectedSound,
    loading,
    selectSoundToEdit,
    handlePublishSuccess,
  };
}
