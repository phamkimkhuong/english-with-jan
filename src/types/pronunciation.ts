export interface IPAExample {
  word: string;
  ipa: string;
  meaning: string;
  audioUrl: string;
}

export interface IPASound {
  ipa: string;
  name: string;
  type: "monophthong_long" | "monophthong_short" | "diphthong" | "consonant_voiceless" | "consonant_voiced";
  description: string;
  mouthShapeImage: string;
  instructionVideo?: string;
  audioUrl: string;
  examples: IPAExample[];
  commonMistakes: string[];
}
