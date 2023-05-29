export const translations = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Wristband Tag ID",
  userTagPin: "Wristband Tag Pin",
  nav: {
    payout: "Pay Out",
    agb: "AGB",
    faq: "FAQ",
  },
  loginFailed: "Login failed: {{reason}}.",
  errorLoadingCustomer: "Error loading customer",
  payoutInfo: "To get your payout after the festival, please <1>enter your bank account details here</1>.",
  about: "About",
  contact: "Contact",
  wristbandTagExample: "Wristband Tag Example",
  wristbandTagExampleTitle: "Wristband Tag Example with PIN and ID",
  termsAndConditionsHeader:
    "Our Terms and Conditions are only available in German. You can access our privacy policy on <1>here</1>.",
  privacyPolicyHeader:
    "Our Privacy Policy is only available in German. You can access our terms and conditions on <1>here</1>.",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  balance: "Balance",
  tagUid: "Wristband Tag ID",
  vouchers: "Vouchers",
  order: {
    loadingError: "Error loading orders",
    productName: "Product Name",
    productPrice: "Product Price",
    quantity: "Quantity",
    total: "Total",
    viewReceipt: "View Receipt",
    bookedAt: "Booked at: {{date}}",
    orderType: {
      sale: "Purchase",
      cancel_sale: "Canceled Purchase",
      top_up: "Top Up",
      pay_out: "Pay Out",
      ticket: "Ticket Purchase",
    },
  },
  payout: {
    info: "Enter your account information to receive your leftover cash to your bank account.",
    ibanNotValid: "IBAN is not valid",
    mustAcceptPrivacyPolicy: "You must accept the privacy policy",
    privacyPolicyCheck: "I have read and agree to StuStaCulum's <1>privacy policy</1>.",
    errorFetchingData: "Error fetching data.",
    updatedBankData: "Successfully updated bank data.",
    errorWhileUpdatingBankData: "Error occurred while updating bank data.",
  },
  topup: {
    info: "You can topup your festival account balance with credit card",
    amount: "Amount",
    errorWhileCreatingCheckout: "Error while trying to create sumup checkout",
    errorAmountGreaterZero: "Amount must be greater than 0",
    errorAmountMustBeIntegral: "Cent amounts are not allowed",
    sumupTopupDisabled: "Online Topup is disabled",
    tryAgain: "Try again",
    success: {
      title: "Top Up succeeded",
      message: "Please continue to the <1>overview page</1>.",
    },
    error: {
      title: "Top Up failed",
      message: "An unknown error occured.",
    },
  },
  faq: {
    0: {
      question: "What is StuStaPay? (Or: Help! The cashier doesn't want my cash!)",
      answer:
        "This year, we are using a self-developed cashless payment system called StuStaPay for the festival. Your entry wristband contains a chip that identifies your account, which you can top up with credit. This means that you no longer need to handle cash at our stands, but can conveniently pay with your entry wristband. Find out how it all works here.",
    },
    1: {
      question: "Where can I get a wristband?",
      answer:
        "Hopefully, you have already purchased one when you arrived at the festival. If you don't have a wristband yet, you can buy one afterwards at the festival tent, at KADE, or in the atrium. Since the wristband is your access to your credit, you should take good care of it. It's best to note down the two PINs on the back right now. With these, you can have your wristband replaced in case of emergency.",
    },
    2: {
      question: "Where can I use StuStaPay?",
      answer:
        "You can pay at all participating sales points. This year, StuStaPay will be used at all beer, wine, and cocktail bars, as well as the bread shop. Unfortunately, our external food and beverage stands are not included yet." +
        "Bars and sales points accepting StuStaPay: " +
        "Festzelt, " +
        "Weißbierinsel, " +
        "Weißbierkarussell, " +
        "Pot-Zelt, " +
        "Ausschank TribüHne, " +
        "KADE (indoor and outdoor areas), " +
        "Cocktailzelt, " +
        "Weinzelt, " +
        "Cuba Lounge and " +
        "Brotladen",
    },
    3: {
      question: "Where can I see how much money I have?",
      answer:
        "You can see your balance with each purchase and top-up. Additionally, you can view your current balance at any time on pay.stustaculum.de. You can also have your balance displayed at any cash register.",
    },
    4: {
      question: "Where can I top up my credit?",
      answer:
        "You can top up your wristband with cash, card, or contactless payment at one of our top-up stations in the atrium, at the festival tent, Café Dada, or at KADE. The credit will be available for your next beer (and any other product of your choice) immediately after topping up. Check the [site map](link) to find the nearest station.",
    },
    5: {
      question: "How does the payment process work?",
      answer:
        "After your order is taken, your chip on the entry wristband is read. Then, you can see your order summary and your credit. After your confirmation, the order is processed, and you will receive your desired product.",
    },
    6: {
      question: "How can I get/use drink vouchers?",
      answer:
        "You receive vouchers as a reward for completed volunteer shifts. These vouchers are also managed digitally on your wristband. After your shift, the stand management transfers the volunteer tokens to your wristband. For some volunteer shifts (e.g., during dismantling), you can receive your vouchers in advance in exchange for a deposit. The vouchers will be automatically deducted from your next order. If you don't want to use the vouchers or only use them partially, you can simply change the suggestion.",
    },
    7: {
      question: "How can I check what I have spent?",
      answer: "You can see your receipts and your balance on pay.stustaculum.de.",
    },
    8: {
      question: "How much money can I load onto my wristband?",
      answer: "You can load a maximum of 150€ onto your wristband.",
    },
    9: {
      question: "Can I also pay with cash or card?",
      answer:
        "No, the effort for this would be too high. Only StuStaPay is accepted as a payment method at all participating stations. However, you can load your wristband with cash or card. Cash is still accepted at stands without StuStaPay.",
    },
    10: {
      question: "What happens if I have remaining credit at the end?",
      answer:
        "You can have the remaining credit transferred to your bank account after the festival by providing your bank details on pay.stustaculum.de. After September 30, 2023, no further withdrawals will be possible.",
    },
    11: {
      question: "Why can't you guarantee the refund?",
      answer:
        "This is for legal reasons. If we were to guarantee the refund, we would essentially be a bank and would need expensive licenses. Don't worry, you will still receive your remaining credit back.",
    },
    12: {
      question: "Can I cash out my credit at the festival?",
      answer:
        "If the lines are not too long, you can have your credit paid out in cash at a top-up station. However, we recommend having the money transferred to your account.",
    },
    13: {
      question: "Help! My chip is damaged!",
      answer:
        "Please contact the information tent. They will replace your entry wristband and transfer the credit to the new band.",
    },
    14: {
      question: "Help! I lost my chip!",
      answer:
        "If you have provided an email on pay.stustaculum.de, we can block the lost chip and give you a new wristband. Otherwise, we cannot transfer your credit.",
    },
    15: {
      question: "I found a chip",
      answer: "Please bring it to the information tent. They collect all lost and found items there.",
    },
    16: {
      question: "What data is stored about me?",
      answer:
        "We store the following information about your wristband on our central server:" +
        " Your account balance," +
        " all transactions (top-ups, card payments, sales, deposit refunds)," +
        " your receipts, and" +
        " your refund transfer details. " +
        "Have a look at our privacy policy for more information.",
    },
    17: {
      question: "What happens in case of a StuStaPay outage?",
      answer:
        "If StuStaPay fails due to unforeseen reasons, we will switch to payment with cash registers as soon as possible. Of course, we will refund the remaining credit on the wristbands as quickly as possible.",
    },
  },
} as const;

export type Translations = typeof translations;

export default translations;
