export const translations = {
  StuStaPay: "StuStaPay",
  logout: "Logout",
  login: "Login",
  userTagUid: "User Tag UID",
  userTagPin: "User Tag Pin",
  loginFailed: "Login failed: {{reason}}.",
  errorLoadingCustomer: "Error loading customer",
  payoutInfo: "To get your payout after the festival, please <1>enter your bank account details here</1>.",
  about: "About",
  contact: "Contact",
  languages: {
    en: "English",
    de: "Deutsch",
  },
  balance: "Balance",
  tagUid: "Tag UID",
  vouchers: "Vouchers",
  order: {
    loadingError: "Error loading orders",
    productName: "Product Name",
    productPrice: "Product Price",
    quantity: "Quantity",
    total: "Total",
    viewReceipt: "View Receipt",
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
} as const;

export type Translations = typeof translations;

export default translations;
