import { type Translations } from "../en/translations";

type NestedPartialAsStrings<T extends object> = {
  [Key in keyof T]?: T[Key] extends string ? string : T[Key] extends object ? NestedPartialAsStrings<T[Key]> : never;
};

export const translations: NestedPartialAsStrings<Translations> = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Chip ID",
  userTagPin: "Chip Pin",
  loginFailed: "Login fehlgeschlagen: {{reason}}.",
  errorLoadingCustomer: "Fehler beim Laden der Kundendaten",
  payoutInfo: "Um dein Restguthaben nach dem Festival zu erhalten, <1>trage bitte deine Bankdaten hier ein</1>.",
  about: "Impressum",
  contact: "Kontakt",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  balance: "Guthaben",
  tagUid: "Chip ID",
  vouchers: "Getränkemarken",
  order: {
    loadingError: "Fehler beim laden der Bestellungen",
    productName: "Produktname",
    productPrice: "Produktpreis",
    quantity: "Menge",
    total: "Summe",
    viewReceipt: "Beleg anzeigen",
    bookedAt: "Gebucht um: {{date}}",
    orderType: {
      sale: "Kauf",
      cancel_sale: "Stornierter Kauf",
      top_up: "Aufladung",
      pay_out: "Auszahlung",
      ticket: "Ticketkauf",
    },
  },
  payout: {
    info: "Trage deine Bankdaten hier ein um dein Restguthaben auf dein Bankkonto zu überweisen.",
    ibanNotValid: "ungültige IBAN",
    mustAcceptPrivacyPolicy: "Sie müssen die Datenschutserklärung akzeptieren",
    privacyPolicyCheck: "Ich habe die <1>Datenschutzerklärung</1> des StuStaCulum gelesen und akzeptiere sie.",
    errorFetchingData: "Fehler beim laden der Daten.",
    updatedBankData: "Bankdaten erfolgreich aktualisiert.",
    errorWhileUpdatingBankData: "Fehler beim aktualisieren der Bankdaten.",
  },
  topup: {
    info: "Du kannst dein Festival-Guthaben hier mit Kreditkarte aufladen.",
    amount: "Betrag",
    errorWhileCreatingCheckout: "Fehler beim erstellen der SumUp-Zahlung.",
    errorAmountGreaterZero: "Betrag muss größer als 0 sein.",
    errorAmountMustBeIntegral: "Centbeträge sind nicht erlaubt.",
    sumupTopupDisabled: "Online-Aufladung ist deaktiviert.",
    tryAgain: "Versuche es noch einmal",
    success: {
      title: "Aufladung erfolgreich",
      message: "Bitte gehe weiter zur <1>Übersichtsseite</1>.",
    },
    error: {
      title: "Aufladung fehlgeschlagen",
      message: "Ein unbekannter Fehler ist aufgetreten.",
    },
  },
} as const;

export default translations;
