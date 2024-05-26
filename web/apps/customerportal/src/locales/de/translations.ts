import { type Translations } from "../en/translations";

type NestedPartialAsStrings<T extends object> = {
  [Key in keyof T]?: T[Key] extends string ? string : T[Key] extends object ? NestedPartialAsStrings<T[Key]> : never;
};

export const translations: NestedPartialAsStrings<Translations> = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Bändchen-Chip ID",
  userTagPin: "Bändchen-Chip Pin",
  loginFailed: "Login fehlgeschlagen: {{reason}}.",
  errorLoadingCustomer: "Fehler beim Laden der Kundendaten",
  payoutInfo:
    "Um dein Restguthaben nach dem Festival zu erhalten, <1>trage bitte deine Bankdaten hier ein</1>. Die erste Auszahlung findet voraussichtlich 3 Wochen nach Festivalende statt.",
  about: "Impressum",
  contact: "Kontakt",
  wristbandTagExample: "Beispiel eines Bändchen-Chips",
  wristbandTagExampleTitle: "Bändchen-Chip Beispiel mit PIN",
  wristbandTagExampleDescription:
    "Die Bändchen-Chip PIN findest Du auf der Rückseite deines Bändchen-Chips. Sie sollte aussehen wie im unteren Beispiel:",
  termsAndConditionsHeader: "Die Datenschutzbestimmungen können <1>hier</1> eingesehen werden.",
  privacyPolicyHeader: "Unsere AGBs können <1>hier</1> eingesehen werden.",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  nav: {
    payout: "Auszahlung",
    topup: "Aufladung",
    agb: "AGB",
    faq: "FAQ",
  },
  balance: "Guthaben",
  tagPin: "Bändchen-Chip Pin",
  tagUid: "Bändchen-Chip Uid",
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
    info: "Damit wir dein Restguthaben überweisen können, trage bitte deine Bankdaten hier ein. Du kannst auch einen Teil oder Dein gesamtes Guthaben an uns spenden, um unser ehrenamtliches Engagement zu unterstützen. Kulturleben in der Studentenstadt e.V. is ein von Studierenden betriebener gemeinnütziger Verein, welcher jährlich das StuStaCulum-Festival organisiert. Die erste Auszahlung findet voraussichtlich 3 Wochen nach Festivalende statt.",
    infoPayoutInitiated: "Du hast deine Bankinformationen bereits angegeben und dein verbleibendes Guthaben wird in der nächsten manuell ausgelösten Auszahlung (in der Regel innerhalb eines Monats) ausgezahlt. Du kannst jedoch weiterhin deine Bankinformationen oder deine Spendenwahl ändern. Vielen Dank für deine Geduld.",
    infoPayoutScheduled: "Du bist für unsere nächste manuell ausgelöste Auszahlung eingeplant, daher kannst du deine Bankinformationen nicht mehr ändern. Halte durch, wir werden dich benachrichtigen, sobald wir die Banküberweisung von unserer Seite aus initiiert haben.",
    infoPayoutCompleted: "Vielen Dank für deine Geduld, wir haben die Banküberweisung von unserer Seite aus am {{payout_date}} initiiert. Möglicherweise hast du die Gelder bereits erhalten, andernfalls sollten sie innerhalb der nächsten Tage eintreffen. Du kannst die Überweisungsdetails in der Transaktionsliste auf der Hauptseite einsehen.",
    ibanNotValid: "ungültige IBAN",
    countryCodeNotSupported: "IBAN Ländercode wird nicht unterstützt",
    nameHasSpecialChars: "Der Accountname enthält nicht valide Sonderzeichen",
    mustAcceptPrivacyPolicy: "Sie müssen die Datenschutserklärung akzeptieren",
    privacyPolicyCheck: "Ich habe die <1>Datenschutzerklärung</1> des StuStaCulum gelesen und akzeptiere sie.",
    errorFetchingData: "Fehler beim laden der Daten.",
    updatedBankData:
      "Bankdaten erfolgreich aktualisiert. Die erste Auszahlung erfolgt voraussichtlich 3 Wochen nach Festivalende.",
    errorWhileUpdatingBankData: "Fehler beim aktualisieren der Bankdaten.",
    donationMustBePositive: "Das Spende muss positiv sein",
    donationExceedsBalance: "Die Spende darf nicht den Kontostand überschreiten",
    donationTitle: "Spende",
    payoutTitle: "Auszahlung",
    donationAmount: "Spendebetrag ",
    donationDescription:
      "Hat dir das Festival gefallen? Wir würden uns über eine Spende freuen, um unsere ehrenamtliche Arbeit zu unterstützen und zukünftige StuStaCula noch besser zu machen.",
    donateRemainingBalanceOf: "Spende verbleibende Summe von {{remainingBalance}}",
    submitPayoutData: "Bankdaten speichern",
    submitPayoutDataEdit: "Bankdaten editieren",
    confirmDonateAllTitle: "Gesamtes Restguthaben spenden?",
    confirmDonateAllContent: "Wills Du dein gesamtes Restguthaben von {{remainingBalance}} spenden?",
    confirmDonateAmountTitle: "Spenden?",
    confirmDonateAmountContent: "Willst Du {{donation}} spenden?",
  },
  topup: {
    onlineTopUp: "Online-Aufladung",
    description: "Du kannst dein Festival-Guthaben hier mit Kreditkarte aufladen.",
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
