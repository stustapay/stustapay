import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import translationsDe from "./locales/de/translations";
import translationsEn from "./locales/en/translations";
import { useI18nextProvider, convertRaTranslationsToI18next } from "ra-i18n-i18next";
import englishMesssages from "ra-language-english";
// @ts-ignore
import germanMessages from "ra-language-german";

export const defaultNS = "translations";

const resources = {
  en: { translations: { ...translationsEn, ...convertRaTranslationsToI18next(englishMesssages) } },
  de: { translations: { ...translationsDe, ...convertRaTranslationsToI18next(germanMessages) } },
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

export const useSSPI18nProvider = () =>
  useI18nextProvider({
    i18nextInstance: i18n,
    availableLocales: [
      { locale: "en", name: "English" },
      { locale: "de", name: "German" },
    ],
  });
