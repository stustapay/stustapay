export const translations = {
  StuStaPay: "TeamFestlichPay",
  TeamFestlichPay: "TeamFestlichPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Voucher card Tag ID",
  userTagPin: "Voucher card Tag Pin",
  nav: {
    payout: "Pay Out",
    topup: "Top Up",
    agb: "AGB",
    faq: "FAQ",
  },
  loginFailed: "Login failed: {{reason}}.",
  errorLoadingCustomer: "Error loading customer",
  errorLoadingBon: "Error loading bon",
  payoutInfo:
    "To enable us to transfer your remaining credit, please enter your bank details here. If you would like to support our volunteer efforts, you can enter an amount of your choice at the point 'Donation Amount'. The system will automatically calculate the payout amount after pressing the 'Save Bank Data' button. If you do not wish to donate any amount, simply press the 'Save Bank Data' button, and the amount available on the card will then be earmarked for payout. The first payout is expected to take place approximately 3 weeks after the end of the event.",
  about: "About",
  contact: "Contact",
  wristbandTagExample: "Voucher card Tag Example",
  wristbandTagExampleTitle: "Voucher card Tag Example with PIN and ID",
  wristbandTagExampleDescription:
    "You can find your Voucher card tag ID and PIN on the back of your Voucher card.",
  termsAndConditionsHeader:
    "Our Terms and Conditions are only available in German. You can access our privacy policy on <1>here</1>.",
  privacyPolicyHeader:
    "Our Privacy Policy is only available in German. You can access our terms and conditions on <1>here</1>.",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  errorPage: {
    error: "Error",
    currentlyUnavailable: "The TeamFestlichPay customer portal is currently unavailable",
  },
  balance: "Balance",
  tagUid: "Voucher card Tag ID",
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
  transaction: {
    cashExit: "Cash Payout",
    sepaExit: "Payout via Bank Transfer",
    donationExit: "Donation",
  },
  payout: {
    iban: "IBAN",
    bankAccountHolder: "Account Holder",
    email: "E-Mail",
    infoPayoutInitiated:
      "You have already provided your bank information and your remaining balance will be payed out in the next manual triggered payout batch (usually within a month). However, you can still edit your bank information or donation choice. Thank you for your patience.",
    infoPayoutScheduled:
      "You are scheduled for our next manual triggered payout, thus you cannot change your bank information anymore. Hold on tide, we will notify you once we have initiated the bank transfer from our side.",
    infoPayoutCompleted:
      "Thank you for our patience, we have initiated the bank transfer from our side on {{payout_date}}. You might have already received the funds, otherwise they should arrive within the next few days. You can see the transfer details in the transaction list on the main page.",
    info: "Please enter your bank account information so we can transfer your leftover balance. You can also donate parts or your whole remaining balance to support our volunteer work. The first payout is planned approximately 3 weeks after the end of the event.",
    ibanNotValid: "IBAN is not valid",
    countryCodeNotSupported: "Provided IBAN country code is not supported",
    nameHasSpecialChars: "Provided account name contains invalid special characters",
    mustAcceptPrivacyPolicy: "You must accept the privacy policy",
    privacyPolicyCheck: "I have read and agree to <1>privacy policy</1>.",
    errorFetchingData: "Error fetching data.",
    updatedBankData: "Successfully updated bank data. Your payout is expected to happen approximately within a month.",
    errorWhileUpdatingBankData: "Error occurred while updating bank data.",
    donationMustBePositive: "Donation must be positive",
    donationExceedsBalance: "Donation cannot exceed your balance",
    donationTitle: "Donation",
    payoutTitle: "Payout",
    donationAmount: "Donate amount",
    payoutAmount: "Payout amount ",
    donationDescription:
      "If you appreciated our hard work to make this event come true, we also welcome donations in order to support our future work",
    donateRemainingBalanceOf: "Donate remaining balance of ",
    submitPayoutData: "Save bank data",
    submitPayoutDataEdit: "Edit bank data",
    confirmDonateAllTitle: "Donate remaining balance?",
    confirmDonateAllContent: "Do you want to donate your remaining balance of {{remainingBalance}}?",
    confirmDonateAmountTitle: "Donate?",
    confirmDonateAmountContent: "Do you want to make a donation of {{donation}}?",
    onlyDuringEvent: "Refunds of remaining balance are only available after the event!",
  },
  topup: {
    onlineTopUp: "Online Top-Up",
    description: "You can top up your balance with credit card here.",
    amount: "Amount",
    errorWhileCreatingCheckout: "Error while trying to create sumup checkout",
    errorAmountGreaterZero: "Amount must be greater than 0",
    errorAmountMustBeIntegral: "Cent amounts are not allowed",
    sumupTopupDisabled: "Online top-up is disabled.",
    tryAgain: "Try again",
    paymentTakingTooLong: "Payment is taking longer than expected. You can wait or try again.",
    unexpectedError: "An unexpected error occurred. Please try again later.",
    next: "Next",
    success: {
      title: "Top-up successful",
      message: "Please proceed to the <1>overview page</1>.",
    },
    error: {
      title: "Top-up failed",
      message: "An unknown error occurred.",
    },
    cancelled: {
      title: "Payment cancelled",
      message: "The payment was cancelled or timed out.",
      defaultMessage: "The payment was cancelled or timed out. You can try again.",
    },
  },
} as const;

export type Translations = typeof translations;

export default translations;
