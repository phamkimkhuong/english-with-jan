import { z } from "zod";

export const IPAExampleSchema = z.object({
  word: z.string(),
  ipa: z.string(),
  meaning: z.string(),
  audioUrl: z.string(),
  audioUrlMale: z.string().optional(),
  type: z.enum(["word", "phrase", "sentence"]).optional().default("word"),
  partOfSpeech: z.string().optional(),
  hidden: z.boolean().optional().default(false),
});

export const IPASoundSchema = z.object({
  ipa: z.string(),
  name: z.string(),
  type: z.enum([
    "monophthong_long",
    "monophthong_short",
    "diphthong",
    "consonant_voiceless",
    "consonant_voiced",
  ]),
  description: z.string(),
  mouthShapeImage: z.string(),
  instructionVideo: z.string().optional(),
  audioUrl: z.string(),
  audioUrlMale: z.string().optional(),
  examples: z.array(IPAExampleSchema),
  commonMistakes: z.array(z.string()),
});

export const IPASyllabusSchema = z.object({
  lastUpdated: z.string().optional(),
  version: z.number().optional(),
  sounds: z.array(IPASoundSchema),
});

export type IPAExample = z.infer<typeof IPAExampleSchema>;
export type IPASound = z.infer<typeof IPASoundSchema>;
export type IPASyllabus = z.infer<typeof IPASyllabusSchema>;
