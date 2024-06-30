import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import translationsDe from "./locales/de/translations";
import translationsEn from "./locales/en/translations";

export const defaultNS = "translations";

export const resources = {
  en: { translations: translationsEn },
  de: { translations: translationsDe },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    ns: [defaultNS],
    debug: true,
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
  });

export { i18n };
export default i18n;
