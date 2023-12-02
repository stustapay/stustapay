import { Language, RestrictedEventSettings } from "@/api";
import { z } from "zod";

export const TranslationTextsSchema = z.object({
  translation_texts: z.record(z.string(), z.record(z.string(), z.string())),
});

export type TranslationTexts = z.infer<typeof TranslationTextsSchema>;

export const updateTranslationTexts = (
  texts: RestrictedEventSettings["translation_texts"],
  language: Language,
  type: string,
  content: string
): RestrictedEventSettings["translation_texts"] => {
  const newTranslationTexts = JSON.parse(JSON.stringify(texts));
  if (newTranslationTexts[language] === undefined) {
    newTranslationTexts[language] = {};
  }
  newTranslationTexts[language][type] = content;

  return newTranslationTexts;
};
