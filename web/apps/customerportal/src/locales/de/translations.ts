import { type Translations } from "../en/translations";

type NestedPartialAsStrings<T extends object> = {
  [Key in keyof T]?: T[Key] extends string ? string : T[Key] extends object ? NestedPartialAsStrings<T[Key]> : never;
};

export const translations: NestedPartialAsStrings<Translations> = {
  StuStaPay: "TeamFestlichPay",
  TeamFestlichPay: "TeamFestlichPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Guthabenkarte-Chip ID",
  userTagPin: "Guthabenkarte-Chip Pin",
  loginFailed: "Login fehlgeschlagen: {{reason}}.",
  errorLoadingCustomer: "Fehler beim Laden der Kundendaten",
  payoutInfo:
    "Um dein Restguthaben nach der Veranstaltung zu erhalten, <1>trage bitte deine Bankdaten hier ein</1>. Die erste Auszahlung findet voraussichtlich 3 Wochen nach Veranstaltungsende statt.",
  about: "Impressum",
  contact: "Kontakt",
  wristbandTagExample: "Beispiel einer Guthabenkarte",
  wristbandTagExampleTitle: "Guthabenkarte-Chip Beispiel mit PIN und ID",
  wristbandTagExampleDescription:
    "Die Chip ID und PIN findest Du auf der Rückseite deiner Guthabenkarte.",
  termsAndConditionsHeader: "Die Datenschutzbestimmungen können <1>hier</1> eingesehen werden.",
  privacyPolicyHeader: "Unsere AGBs können <1>hier</1> eingesehen werden.",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  errorPage: {
    error: "Fehler",
    currentlyUnavailable: "Das TeamFestlichPay Kundenportal ist aktuell nicht verfügbar",
  },
  transaction:
  {
    sepaExit: "Auszahlung (SEPA)"
  },
  nav: {
    payout: "Auszahlung",
    topup: "Aufladung",
    agb: "AGB",
    faq: "FAQ",
  },
  balance: "Guthaben",
  tagUid: "Guthabenkarte-Chip ID",
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
    iban: "IBAN",
    bankAccountHolder: "Kontoinhaber",
    email: "E-Mail",
    infoPayoutInitiated:
      "Du hast deine Bankinformationen bereits angegeben und dein verbleibendes Guthaben wird in der nächsten manuell ausgelösten Auszahlung (in der Regel innerhalb eines Monats) ausgezahlt. Du kannst jedoch weiterhin deine Bankinformationen oder deine Spendenwahl ändern. Vielen Dank für deine Geduld.",
    infoPayoutScheduled:
      "Du bist für unsere nächste manuell ausgelöste Auszahlung eingeplant, daher kannst du deine Bankinformationen nicht mehr ändern. Halte durch, wir werden dich benachrichtigen, sobald wir die Banküberweisung von unserer Seite aus initiiert haben.",
    infoPayoutCompleted:
      "Vielen Dank für deine Geduld, wir haben die Banküberweisung von unserer Seite aus am {{payout_date}} initiiert. Möglicherweise hast du die Gelder bereits erhalten, andernfalls sollten sie innerhalb der nächsten Tage eintreffen. Du kannst die Überweisungsdetails in der Transaktionsliste auf der Hauptseite einsehen.",
    info: "Damit wir dein Restguthaben überweisen können, trage bitte Deine Bankdaten hier ein. Wenn Du unser ehrenamtliches Engagement unterstützen möchtest, kannst Du bei dem Punkt \"Spendenbetrag\" einen Betrag Deiner Wahl eingegeben. Das System errechnet nach dem Drücken des Buttons \"Bankdaten speichern\" dann automatisch den Auszahlungsbetrag. Möchtest Du keinen Betrag spenden bitte einfach nur den Button \"Bankdaten speichern\" drücken, der auf der Karte verfügbare Betrag wird dann zur Auszahlung vorgemerkt.Die erste Auszahlung findet voraussichtlich 3 Wochen nach Veranstaltungsende statt.",
    ibanNotValid: "ungültige IBAN",
    countryCodeNotSupported: "IBAN Ländercode wird nicht unterstützt",
    nameHasSpecialChars: "Der Accountname enthält nicht valide Sonderzeichen",
    mustAcceptPrivacyPolicy: "Sie müssen die Datenschutserklärung akzeptieren",
    privacyPolicyCheck: "Ich habe die <1>Datenschutzerklärung</1> gelesen und akzeptiere sie.",
    errorFetchingData: "Fehler beim laden der Daten.",
    updatedBankData:
      "Bankdaten erfolgreich aktualisiert. Die erste Auszahlung erfolgt voraussichtlich 3 Wochen nach Veranstaltungsende.",
    errorWhileUpdatingBankData: "Fehler beim aktualisieren der Bankdaten.",
    donationMustBePositive: "Das Spende muss positiv sein",
    donationExceedsBalance: "Die Spende darf nicht den Kontostand überschreiten",
    donationTitle: "Spende",
    payoutTitle: "Auszahlung",
    donationAmount: "Spendebetrag ",
    payoutAmount: "Auszahlungsbetrag ",
    donationDescription:
      "Hat dir die Veranstaltung gefallen? Wir würden uns über eine Spende freuen, um unsere ehrenamtliche Arbeit zu unterstützen.",
    donateRemainingBalanceOf: "Spende verbleibende Summe von ",
    submitPayoutData: "Bankdaten speichern",
    submitPayoutDataEdit: "Bankdaten editieren",
    confirmDonateAllTitle: "Gesamtes Restguthaben spenden?",
    confirmDonateAllContent: "Wills Du dein gesamtes Restguthaben von {{remainingBalance}} spenden?",
    confirmDonateAmountTitle: "Spenden?",
    confirmDonateAmountContent: "Willst Du {{donation}} spenden?",
    onlyDuringEvent: "Eine Auszahlung des Restguthabens ist erst nach der Veranstaltung möglich!",
  },
  topup: {
    onlineTopUp: "Online-Aufladung",
    description: "Du kannst dein Guthaben hier mit Kreditkarte aufladen.",
    amount: "Betrag",
    errorWhileCreatingCheckout: "Fehler beim erstellen der SumUp-Zahlung.",
    errorAmountGreaterZero: "Betrag muss größer als 0 sein.",
    errorAmountMustBeIntegral: "Centbeträge sind nicht erlaubt.",
    sumupTopupDisabled: "Online-Aufladung ist deaktiviert.",
    tryAgain: "Versuche es noch einmal",
    paymentTakingTooLong: "Die Zahlung dauert länger als erwartet. Du kannst warten oder es noch einmal versuchen.",
    unexpectedError: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später noch einmal.",
    success: {
      title: "Aufladung erfolgreich",
      message: "Bitte gehe weiter zur <1>Übersichtsseite</1>.",
    },
    error: {
      title: "Aufladung fehlgeschlagen",
      message: "Ein unbekannter Fehler ist aufgetreten.",
    },
    cancelled: {
      title: "Zahlung abgebrochen",
      message: "Die Zahlung wurde abgebrochen oder ist abgelaufen.",
      defaultMessage: "Die Zahlung wurde abgebrochen oder ist abgelaufen. Du kannst es erneut versuchen.",
    },
  },
} as const;

export default translations;
