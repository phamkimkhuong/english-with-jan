const ipaSlugMap: Record<string, string> = {
  "i:": "i-long",
  "ɪ": "i-short",
  "e": "e",
  "æ": "ae",
  "ɑ:": "a-long",
  "ɑ:r": "a-long-r",
  "ɔ:": "o-long",
  "ɔ:r": "o-long-r",
  "ʊ": "u-short",
  "u:": "u-long",
  "ɜ:r": "er",
  "ə": "schwa",
  "ʌ": "ah",
  "eɪ": "ei",
  "aɪ": "ai",
  "ɔɪ": "oy",
  "aʊ": "au",
  "əʊ": "ou",
  "ɪə": "ia",
  "eə": "ea",
  "ʊə": "ua",
  "p": "p",
  "b": "b",
  "t": "t",
  "d": "d",
  "tʃ": "ch",
  "dʒ": "dj",
  "k": "k",
  "g": "g",
  "f": "f",
  "v": "v",
  "θ": "th-voiceless",
  "ð": "th-voiced",
  "s": "s",
  "z": "z",
  "ʃ": "sh",
  "ʒ": "zh",
  "h": "h",
  "m": "m",
  "n": "n",
  "ŋ": "ng",
  "l": "l",
  "r": "r",
  "w": "w",
  "j": "y"
};

// Đảo ngược để tìm ngược lại
const slugIpaMap: Record<string, string> = Object.fromEntries(
  Object.entries(ipaSlugMap).map(([ipa, slug]) => [slug, ipa])
);

export function getSlugFromIpa(ipa: string): string {
  return ipaSlugMap[ipa] || encodeURIComponent(ipa);
}

export function getIpaFromSlug(slug: string): string {
  return slugIpaMap[slug] || decodeURIComponent(slug);
}
