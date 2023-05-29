export const translations = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "Wristband Tag ID",
  userTagPin: "Wristband Tag Pin",
  loginFailed: "Login failed: {{reason}}.",
  errorLoadingCustomer: "Error loading customer",
  payoutInfo: "To get your payout after the festival, please <1>enter your bank account details here</1>.",
  about: "About",
  contact: "Contact",
  wristbandTagExample: "Wristband Tag Example",
  wristbandTagExampleTitle: "Wristband Tag Example with PIN and ID",
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
} as const;

export type Translations = typeof translations;

export default translations;
