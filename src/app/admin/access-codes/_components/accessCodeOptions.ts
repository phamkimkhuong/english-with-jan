export const AVAILABLE_COURSES = [
  { id: "all", title: "Tất cả các khóa học (Trọn gói VIP)" },
  { id: "ipa", title: "Phát âm (IPA) chuẩn Quốc tế" },
  { id: "office-communication", title: "Tiếng Anh Giao Tiếp Văn Phòng Thực Chiến" },
  { id: "practical-grammar", title: "Ngữ Pháp Thực Hành Cho Người Đi Làm" },
  { id: "academic-vocabulary", title: "Từ Vựng & Phát Âm Căn Bản Cho Sinh Viên" },
] as const;

export const IPA_SOUNDS_LIST = [
  { slug: "i-long", ipa: "i:", desc: "Nguyên âm i dài" },
  { slug: "i-short", ipa: "ɪ", desc: "Nguyên âm i ngắn" },
  { slug: "e", ipa: "e", desc: "Nguyên âm e" },
  { slug: "ae", ipa: "æ", desc: "Nguyên âm e bẹt (ae)" },
  { slug: "a-long", ipa: "ɑ:", desc: "Nguyên âm a dài" },
  { slug: "a-long-r", ipa: "ɑ:r", desc: "Nguyên âm a uốn lưỡi (/ɑ:r/)" },
  { slug: "o-long", ipa: "ɔ:", desc: "Nguyên âm o ngắn & o dài không r (/ɔ:/)" },
  { slug: "o-long-r", ipa: "ɔ:r", desc: "Nguyên âm o uốn lưỡi (/ɔ:r/)" },
  { slug: "u-short", ipa: "ʊ", desc: "Nguyên âm u ngắn" },
  { slug: "u-long", ipa: "u:", desc: "Nguyên âm u dài" },
  { slug: "er", ipa: "ɜ:r", desc: "Nguyên âm ơ uốn lưỡi (/ɜ:r/)" },
  { slug: "schwa", ipa: "ə", desc: "Nguyên âm ơ ngắn" },
  { slug: "ah", ipa: "ʌ", desc: "Nguyên âm á (ah)" },
  { slug: "ei", ipa: "eɪ", desc: "Nguyên âm đôi ei" },
  { slug: "ai", ipa: "aɪ", desc: "Nguyên âm đôi ai" },
  { slug: "oy", ipa: "ɔɪ", desc: "Nguyên âm đôi oi (oy)" },
  { slug: "au", ipa: "aʊ", desc: "Nguyên âm đôi ao (au)" },
  { slug: "ou", ipa: "əʊ", desc: "Nguyên âm đôi ou" },
  { slug: "ia", ipa: "ɪə", desc: "Nguyên âm đôi ia" },
  { slug: "ea", ipa: "eə", desc: "Nguyên âm đôi ea" },
  { slug: "ua", ipa: "ʊə", desc: "Nguyên âm đôi ua" },
  { slug: "p", ipa: "p", desc: "Phụ âm p" },
  { slug: "b", ipa: "b", desc: "Phụ âm b" },
  { slug: "t", ipa: "t", desc: "Phụ âm t" },
  { slug: "d", ipa: "d", desc: "Phụ âm d" },
  { slug: "ch", ipa: "tʃ", desc: "Phụ âm ch" },
  { slug: "dj", ipa: "dʒ", desc: "Phụ âm dʒ (dj)" },
  { slug: "k", ipa: "k", desc: "Phụ âm k" },
  { slug: "g", ipa: "g", desc: "Phụ âm g" },
  { slug: "f", ipa: "f", desc: "Phụ âm f" },
  { slug: "v", ipa: "v", desc: "Phụ âm v" },
  { slug: "th-voiceless", ipa: "θ", desc: "Phụ âm th vô thanh" },
  { slug: "th-voiced", ipa: "ð", desc: "Phụ âm th hữu thanh" },
  { slug: "s", ipa: "s", desc: "Phụ âm s" },
  { slug: "z", ipa: "z", desc: "Phụ âm z" },
  { slug: "sh", ipa: "ʃ", desc: "Phụ âm sh" },
  { slug: "zh", ipa: "ʒ", desc: "Phụ âm zh" },
  { slug: "h", ipa: "h", desc: "Phụ âm h" },
  { slug: "m", ipa: "m", desc: "Phụ âm m" },
  { slug: "n", ipa: "n", desc: "Phụ âm n" },
  { slug: "ng", ipa: "ŋ", desc: "Phụ âm ng" },
  { slug: "l", ipa: "l", desc: "Phụ âm l" },
  { slug: "r", ipa: "r", desc: "Phụ âm r" },
  { slug: "w", ipa: "w", desc: "Phụ âm w" },
  { slug: "y", ipa: "j", desc: "Bán nguyên âm y (j)" },
] as const;

export function getFriendlyTargetLabel(path: string): string {
  if (path === "/courses") return "Danh sách khóa học";
  if (path === "/pronunciation") return "Bảng phát âm IPA";

  if (path.startsWith("/pronunciation/")) {
    const slug = path.replace("/pronunciation/", "");
    const matchedSound = IPA_SOUNDS_LIST.find((sound) => sound.slug === slug);

    if (matchedSound) {
      return `Âm /${matchedSound.ipa}/ (${matchedSound.desc})`;
    }

    return `Phát âm: ${slug}`;
  }

  return path;
}
