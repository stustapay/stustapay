import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import translationsDe from "./locales/de/translations";
import translationsEn from "./locales/en/translations";
import { common_en, common_de } from "@stustapay/translations";

export const defaultNS = "translations";

const resources = {
  en: { translations: translationsEn, common: common_en },
  de: { translations: translationsDe, common: common_de },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    ns: ["translations"],
    debug: true,
    defaultNS: defaultNS,
    resources: resources,
    interpolation: { escapeValue: false },
  });

export { i18n };
export default i18n;
