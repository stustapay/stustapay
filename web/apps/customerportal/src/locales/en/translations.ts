export const translations = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Wristband Tag ID",
  userTagPin: "Wristband Tag Pin",
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
    "To get your payout after the festival, please <1>enter your bank account details here</1>. Your payout will happen approximately within one month.",
  about: "About",
  contact: "Contact",
  wristbandTagExample: "Wristband Tag Example",
  wristbandTagExampleTitle: "Wristband Tag Example with PIN",
  wristbandTagExampleDescription:
    "You can find your wristband tag PIN on the back of your wristband tag. It should look like the example given below:",
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
    currentlyUnavailable: "The StuStaPay customer portal is currently unavailable",
  },
  balance: "Balance",
  tagPin: "Wristband Tag Pin",
  tagUid: "Wristband Tag Uid",
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
    bankAccountHolder: "Bank Account Holder",
    email: "E-Mail",
    info: "Please enter your bank account information so we can transfer your leftover balance. You can also donate parts or your whole remaining balance to support our volunteer work. Kulturleben in der Studentenstadt e. V. is a student-run non-profit organization which annually holds the StuStaCulum festival. The payout will happen within approximately one month.",
    infoPayoutInitiated:
      "You have already provided your bank information and your remaining balance will be payed out in the next manual triggered payout batch (usually within a month). However, you can still edit your bank information or donation choice. Thank you for your patience.",
    infoPayoutScheduled:
      "You are scheduled for our next manual triggered payout, thus you cannot change your bank information anymore. Hold on tide, we will notify you once we have initiated the bank transfer from our side.",
    infoPayoutCompleted:
      "Thank you for our patience, we have initiated the bank transfer from our side on {{payout_date}}. You might have already received the funds, otherwise they should arrive within the next few days. You can see the transfer details in the transaction list on the main page.",
    ibanNotValid: "IBAN is not valid",
    countryCodeNotSupported: "Provided IBAN country code is not supported",
    nameHasSpecialChars: "Provided account name contains invalid special characters",
    mustAcceptPrivacyPolicy: "You must accept the privacy policy",
    privacyPolicyCheck: "I have read and agree to StuStaCulum's <1>privacy policy</1>.",
    errorFetchingData: "Error fetching data.",
    updatedBankData: "Successfully updated bank data. Your payout is expected to happen approximately within a month.",
    errorWhileUpdatingBankData: "Error occurred while updating bank data.",
    donationMustBePositive: "Donation must be positive",
    donationExceedsBalance: "Donation cannot exceed your balance",
    donationTitle: "Donation",
    payoutTitle: "Payout",
    donationAmount: "Donate amount",
    donationDescription:
      "If you appreciated our hard work to make this festival come true, we also welcome donations in order to support our future work",
    donateRemainingBalanceOf: "Donate remaining balance of {{remainingBalance}}",
    submitPayoutData: "Save bank data",
    submitPayoutDataEdit: "Edit bank data",
    confirmDonateAllTitle: "Donate remaining balance?",
    confirmDonateAllContent: "Do you want to donate your remaining balance of {{remainingBalance}}?",
    confirmDonateAmountTitle: "Donate?",
    confirmDonateAmountContent: "Do you want to make a donation of {{donation}}?",
  },
  topup: {
    amount: "Amount",
    errorWhileCreatingCheckout: "Error while trying to create sumup checkout",
    errorAmountGreaterZero: "Amount must be greater than 0",
    errorAmountMustBeIntegral: "Cent amounts are not allowed",
    sumupTopupDisabled: "Online Topup is disabled",
    tryAgain: "Try again",
    onlineTopUp: "Online Top-Up",
    description: "You can top up your account with a credit card here.",
    next: "Next",
    success: {
      title: "Top Up succeeded",
      message: "Please continue to the <1>overview page</1>.",
    },
    error: {
      title: "Top Up failed",
      message: "An unknown error occured.",
    },
  },
} as const;

export type Translations = typeof translations;

export default translations;
