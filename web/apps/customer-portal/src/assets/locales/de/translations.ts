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
  wristbandTagExampleTitle: "Bändchen-Chip Beispiel mit PIN und ID",
  wristbandTagExampleDescription:
    "Die Bändchen-Chip ID und PIN findest Du auf der Rückseite deines Bändchen-Chips. Sie sollte aussehen wie im unteren Beispiel:",
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
  tagUid: "Bändchen-Chip ID",
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
    ibanNotValid: "ungültige IBAN",
    countryCodeNotSupported: "IBAN Ländercode wird nicht unterstützt",
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
    donateRemainingBalanceOf: "Spende verbleibende Summe von ",
    submitPayoutData: "Bankdaten speichern",
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
  faq: {
    0: {
      question: "Was ist StuStaPay? (Oder: Hilfe! Der Kassierer will mein Bargeld nicht!)",
      answer:
        "Dieses Jahr verwenden wir auf dem Festival erstmals ein selbst entwickeltes bargeldloses Bezahlsystem: " +
        "StuStaPay. An deinem Eintrittsband befindet sich ein Chip, der dein Konto identifiziert, auf das du Guthaben aufladen kannst. Das heißt, dass du an unseren Ständen nicht mehr mit Bargeld hantieren musst, sondern bequem mit deinem Eintrittsbändchen zahlen kannst. Wie das ganze funktioniert erfährst du hier.",
    },
    1: {
      question: "Wo bekomme ich ein Bändchen?",
      answer:
        "Das hast du hoffentlich schon gekauft, als du auf das Festival gekommen bist. Falls du noch kein Bändchen hast, kannst du nachträglich eines am Festzelt, beim KADE oder im Atrium erwerben. Da das Bändchen dein Zugang zu deinem Guthaben ist, solltest du gut darauf aufpassen. Notiere dir am besten jetzt schon die beiden PINs auf der Rückseite. Mit diesen kannst du im Notfall dein Bändchen tauschen lassen.",
    },
    2: {
      question: "Wo kann ich StuStaPay verwenden?",
      answer:
        "Du kannst an allen teilnehmenden Verkaufsstellen bezahlen. Dieses Jahr wird an allen Bier-, Wein- und Cocktailausschänken sowie dem Brotladen StuStaPay verwendet. Unsere externen Essens- und Getränkestände sind leider noch nicht mit einbezogen." +
        "Ausschänke und Verkaufsstellen mit StuStaPay: " +
        "Festzelt, " +
        "Weißbierinsel, " +
        "Weißbierkarussell, " +
        "Pot-Zelt, " +
        "Ausschank TribüHne, " +
        "KADE (Innen- und Außenbereich), " +
        "Cocktailzelt, " +
        "Weinzelt, " +
        "Cuba Lounge und " +
        "Brotladen",
    },
    3: {
      question: "Wo kann ich sehen wie viel Geld ich habe?",
      answer:
        "Bei jedem Kauf und jeder Aufladung siehst du dein Guthaben. Auf pay.stustaculum.de kannst du außerdem jederzeit dein aktuelles Guthaben einsehen. Zusätzlich kannst du auch an jeder Kasse dein Guthaben anzeigen lassen.",
    },
    4: {
      question: "Wo kann ich Guthaben aufladen?",
      answer:
        "An einer unserer Aufladestationen im Atrium, am Festzelt, beim Café Dada oder am KADE kannst du mit Bargeld, Karte oder kontaktloser Bezahlung Guthaben auf dein Bändchen buchen. Das Guthaben steht dir danach sofort für die nächste Maß Bier (und natürlich jedes andere Produkt deiner Wahl) zur Verfügung. Schau am besten auf den [Geländeplan](link), wo sich die nächstgelegene Station befindet.",
    },
    5: {
      question: "Wie funktioniert die Bezahlung?",
      answer:
        "Nachdem deine Bestellung aufgenommen wurde, wird dein Chip am Eintrittsband eingelesen. Danach kannst du deine Bestellzusammenfassung und dein Guthaben sehen. Nach deinem OK wird die Bestellung gebucht und du bekommst dein gewünschtes Produkt.",
    },
    6: {
      question: "Wie bekomme/verwende ich Getränkegutscheine?",
      answer:
        "Gutscheine bekommst du als Belohnung für absolvierte Helferschichten. Diese werden ebenfalls digital über dein Bändchen verwaltet. Nach deiner Schicht übertragt deine Standleitung die Helfermarken auf dein Bändchen. Bei manchen Helferschichten (zum Beispiel beim Abbau) kannst du deine Gutscheine auch schon früher gegen Pfand erhalten. Die Gutscheine werden bei deiner nächsten Bestellung automatisch verrechnet. Wenn du die Gutscheine nicht oder nur teilweise einsetzen möchtest, kannst du den Vorschlag einfach ändern.",
    },
    7: {
      question: "Wie kann ich prüfen, was ich ausgegeben habe?",
      answer: "Auf pay.stustaculum.de kannst du deine Belege und dein Guthaben sehen.",
    },
    8: {
      question: "Wie viel Geld kann ich aufladen?",
      answer: "Du kannst maximal 150€ auf dein Bändchen laden.",
    },
    9: {
      question: "Kann ich auch bar oder mit Karte bezahlen?",
      answer:
        "Nein, der Aufwand hierfür wäre leider viel zu hoch. An allen teilnehmenden Stationen wird nur noch StuStaPay als Zahlungsmittel akzeptiert. Du kannst dein Bändchen aber mit Bargeld oder Karte aufladen. An Ständen ohne StuStaPay wird weiterhin Bargeld akzeptiert.",
    },
    10: {
      question: "Was passiert wenn ich am Ende noch Guthaben übrig habe?",
      answer:
        "Du kannst dir das Guthaben nach Ende des Festivals von uns überweisen lassen, indem du auf pay.stustaculum.de deine Bankdaten hinterlegst. Nach dem 30.09.2023 sind keine Auszahlungen mehr möglich.",
    },
    11: {
      question: "Warum könnt ihr die Rückzahlung nicht zusichern?",
      answer:
        "Das hat rechtliche Gründe. Wenn wir die Rückzahlung garantieren, wären wir quasi eine Bank und müssten entsprechend teure Lizenzen einholen. Keine Angst, du bekommst dein Restguthaben trotzdem zurück.",
    },
    12: {
      question: "Kann ich mein Guthaben auf dem Festival auszahlen lassen?",
      answer:
        "Wenn die Schlangen nicht zu lang sind, kannst du an einer Aufladestation dein Guthaben als Bargeld auszahlen lassen. Wir empfehlen dir aber, dir das Geld überweisen zu lassen.",
    },
    13: {
      question: "Hilfe! Mein Chip ist kaputt!",
      answer:
        "Wende dich ans Infozelt. Dort wird dein Eintrittsband ausgetauscht und das Guthaben wird auf das neue Band übertragen.",
    },
    14: {
      question: "Hilfe! Ich habe meinen Chip verloren!",
      answer:
        "Falls du eine E-Mail auf pay.stustaculum.de hinterlegt hast, können wir den verlorenen Chip sperren und dir ein neues Band aushändigen. Andernfalls können wir dein Guthaben leider nicht übertragen.",
    },
    15: {
      question: "Ich habe einen Chip gefunden",
      answer: "Bring diesen bitte zum Infozelt, dort sammeln wir alle Fundsachen.",
    },
    16: {
      question: "Welche Daten werden von mir gespeichert?",
      answer:
        "Wir speichern zu deinem Bändchen folgende Informationen auf unserem zentralen Server:" +
        " Dein Kontostand," +
        " Alle Transaktionen (Aufladungen, EC, Verkauf, Pfandrückzahlung)," +
        " Deine Belege und" +
        " Deine Rücküberweisungsdaten. Mehr informationen findest du in unserer Datenschutzerklärung.",
    },
    17: {
      question: "Was passiert bei einem Ausfall von StuStaPay?",
      answer:
        "Sollte StuStaPay aus unvorhergesehenen Gründen ausfallen, werden wir schnellstmöglich auf eine Bezahlung mit Registrierkassen umstellen. Das Restguthaben auf den Bändchen zahlen wir selbstverständlich so schnell wie möglich zurück.",
    },
  },
} as const;

export default translations;
