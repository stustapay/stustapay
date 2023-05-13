import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationsEn from "./assets/locales/en/translations";
import translationsDe from "./assets/locales/de/translations";
import LanguageDetector from "i18next-browser-languagedetector";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNs: "translations";
    resources: {
      translations: typeof translationsEn;
    };
  }
}

const resources = {
  en: { translations: translationsEn },
  de: { translations: translationsDe },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    debug: true,
    defaultNS: "translations",
    resources: resources,
    interpolation: { escapeValue: false },
  });

export default i18n;
