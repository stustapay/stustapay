export const translations = {
  StuStaPay: "StuStaPay",
  cashiers: "Cashiers",
  advanced: "Advanced",
  accounts: "Accounts",
  systemAccounts: "System Accounts",
  findAccounts: "Find Accounts",
  orders: "Orders",
  transactions: "Transactions",
  submit: "Submit",
  download: "Download",
  products: "Products",
  tickets: "Tickets",
  actions: "Actions",
  add: "Add",
  email: "E-Mail",
  edit: "Edit",
  delete: "Delete",
  copy: "Copy",
  save: "Save",
  update: "Update",
  logout: "Logout",
  login: "Login",
  moneyOverview: "Overview",
  taxRates: "Tax Rates",
  users: "Users",
  userRoles: "User Roles",
  confirm: "Confirm",
  cancel: "Cancel",
  tills: "Tills",
  dsfinvk: "DSFinV-K",
  preview: "Preview",
  tillLayouts: "Till Layouts",
  tillButtons: "Till Buttons",
  tillProfiles: "Till Profiles",
  registerStockings: "Cash Register Stockings",
  registers: "Cash Registers",
  userToRoles: "User to Roles",
  common: {
    id: "ID",
    node: "Node",
    copiedToClipboard: "Copied to clipboard",
    definedAtNode: "Node",
    loadingError: "Errors while loading page",
    configLoadFailed: "Something went wrong while loading the page configuration: {{what}}",
    overview: "Overview",
    search: "Search",
    email: "E-Mail",
    name: "Name",
    description: "Description",
    notSet: "Not set",
    amount: "Amount",
    donation: "Donation",
    status: "Status",
    yes: "Yes",
    no: "No",
    cashier: "Cashier",
    till: "Till",
    create: "Create",
  },
  nodes: {
    overview: "Overview",
    statistics: "Stats",
    settings: "Settings",
  },
  account: {
    overview: "Overview",
    name: "Name",
    comment: "Comment",
    balance: "Balance",
    type: "Type",
    id: "ID",
    user_tag_uid: "User Tag Uid",
    user_tag_pin: "User Tag Pin",
    vouchers: "Vouchers",
    changeBalance: "Change Balance",
    oldBalance: "Old Balance",
    newBalance: "New Balance",
    changeVoucherAmount: "Change Voucher Amount",
    oldVoucherAmount: "Old Voucher Amount",
    newVoucherAmount: "New Voucher Amount",
    changeTag: "Change associated tag",
    oldTagUid: "UID of old tag",
    newTagUid: "UID of new tag",
    disable: "Disable",
    disableSuccess: "Successfully disabled account",
    findAccounts: "Find Accounts",
    searchTerm: "Search Term",
    history: {
      title: "Account tag association history",
      validUntil: "Valid until",
      account: "Account",
      comment: "Comment",
    },
  },
  userTag: {
    userTag: "User Tag",
    userTags: "User Tags",
    find: "Find User Tags",
    searchTerm: "Search Term",
    pin: "User Tag Pin",
    uid: "User Tag Uid",
    comment: "Comment",
    noAccount: "No account associated",
    account: "Account",
    user: "User",
    noUser: "No user associated",
    accountHistory: "Account association history",
    restriction: "User Tag restriction",
    secret: "Secret these tags use",
    create: "Create new user tags for this event",
    createButton: "Create new tags",
    uploadPinCsv: "Upload CSV with tag pins",
    uploadPinCsvDescription:
      'Csv with one column "pin" containing the string encoded pins of all tags which are to be created',
    willCreate: "Will create {{nTags}} new user tags",
    firstNTags: "The following are the first {{actualNum}} tags which will be created",
  },
  userTagSecret: {
    create: "Upload a new user tag secret for this event",
    createButton: "Upload secret",
    key0: "Hex encoded key0 of this secret",
    key1: "Hex encoded key1 of this secret",
  },
  auth: {
    signIn: "Sign In",
    username: "Username",
    password: "Password",
    login: "Login",
    loginFailed: "Login failed: {{reason}}.",
    profile: "Profile",
    selectNode: "Select node for login",
    changePassword: "Change Password",
    oldPassword: "Old password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    successfullyChangedPassword: "Successfully changed password",
    passwordsDontMatch: "Passwords do not match",
    passwordChangeFailed: "Changing password failed: {{reason}}.",
  },
  cashier: {
    login: "Login",
    name: "Name",
    description: "Description",
    cashDrawerBalance: "Cash Drawer",
    tagId: "Tag ID",
    terminal: "Terminal",
    terminals: "Terminals",
    shifts: "Shifts",
    closeOut: "Close Out",
    showWithoutTill: "Show without till",
    showZeroBalance: "Show with zero balance",
    notLoggedInAtTill: "Cashier is not logged at a terminal",
    cashRegister: "Assigned cash register",
    closeOuts: "Close outs",
  },
  shift: {
    id: "ID",
    comment: "Comment",
    startedAt: "Started At",
    endedAt: "Ended At",
    cashRegister: "Cash Register",
    actualCashDrawerBalance: "Final Cash Drawer Balance as counted",
    expectedCashDrawerBalance: "Final Expected Cash Drawer Balance",
    cashDrawerImbalance: "Final Cash Drawer Imbalance",
    soldProductQuantity: "Quantity",
    bookedProducts: "Booked products",
    orders: "Orders",
  },
  closeOut: {
    start: "Start",
    warningStillLoggedInTitle: "Warning",
    warningStillLoggedIn:
      "The cashier is still logged in at a terminal, either manually log him out if possible, otherwise force logout at the till itself.",
    targetInDrawer: "Target in cash drawer",
    countedInDrawer: "Counted in cash drawer",
    difference: "Difference",
    denomination: "Denominiation",
    comment: "Comment",
    closingOutUser: "Closing out User",
    sum: "Sum",
    sumInCashDrawer: "Sum in cash drawer",
    coins: "Coins",
    bill: "{{denomination}}{{currencySymbol}} *",
    totalCashCount: "Total Cash Count",
    noCashDrawerWarning: "The cashier does not have an assigned cash drawer",
  },
  transaction: {
    id: "ID",
    name: "Transaction with ID: {{id}}",
    conductingUser: "Conducting User",
    sourceAccount: "Source account",
    targetAccount: "Target account",
    order: "Associated order",
    amount: "Amount",
    voucherAmount: "Voucher Amount",
    customerAccount: "Customer Account {{id}}",
  },
  order: {
    id: "ID",
    itemCount: "number of items",
    lineItems: "Line items",
    status: "Status",
    paymentMethod: "Payment Method",
    customerAccountId: "Customer Account ID",
    customerTagUid: "Customer Tag Uid",
    cashRegister: "Cash Register",
    bookedAt: "Booked At",
    type: "Type",
    name: "Order with ID: {{id}}",
    totalPrice: "Total Price",
    totalTax: "Total Tax",
    totalNoTax: "Total Without Tax",
    cancel: "Cancel",
    confirmCancelOrderTitle: "Cancel Order",
    confirmCancelOrderDescription: "Are you sure you want to cancel this order?",
    cancelSuccessful: "Successfully cancelled order",
    cancelError: "Error cancelling order: {{what}}",
    editOrderInfo:
      "Editing an order can only be done as long as it has not been cancelled. After editing, the original order will be cancelled and a new one will be created.",
    noCashier: "No cashier assocated with this order",
    noTill: "No till associated with this order, this is weird!!!",
  },
  item: {
    product: "Product",
    productPrice: "Product Price",
    quantity: "Quantity",
    totalPrice: "Total Price",
    taxName: "Tax",
    taxRate: "Tax Rate",
    totalTax: "Total Tax",
  },
  overview: {
    title: "Overview",
    fromTimestamp: "From",
    toTimestamp: "To",
    mostSoldProducts: "Most sold products",
    showDetails: "Show Details",
    quantitySold: "# Sold",
    selectedTill: "Till",
    statsByTill: "Products sold by till",
    depositBalance: "Deposit balance (# collected deposits)",
    hideDeposits: "Hide deposits",
    voucherStats: "Vouchers",
    vouchersIssued: "Issued",
    vouchersSpent: "Spent",
    groupByDay: "Group by day",
    showRevenue: "Show revenue",
    warningEventDatesNeedConfiguration:
      "Please configure the start / end times for this event as well as the daily end time in the event settings",
    generateRevenueReport: "Generate revenue report",
  },
  ticket: {
    name: "Name",
    product: "Product",
    price: "Price",
    isLocked: "Locked",
    lock: "Lock Ticket",
    taxRate: "Tax Rate",
    totalPrice: "Total Price",
    initialTopUpAmount: "Initial top up amount",
    restriction: "Restriction",
    create: "Add a new ticket",
    update: "Update ticket",
    delete: "Delete ticket",
    deleteDescription: "Confirm ticket deletion",
  },
  externalTicket: {
    id: "ID",
    externalReference: "External reference",
    type: "Type",
    createdAt: "Created at",
    presaleTickets: "Presale tickets",
    customerAccount: "Customer",
    hasCheckedIn: "Checked in ",
    token: "Token",
  },
  product: {
    name: "Name",
    price: "Price",
    priceInVouchers: "Price in Vouchers",
    restrictions: "Restrictions",
    isLocked: "Locked",
    isReturnable: "Can be returned",
    isFixedPrice: "Fixed Price",
    taxRate: "Tax Rate",
    fixedPrice: "Price is fixed",
    lock: "Lock Product",
    create: "Add a new product",
    update: "Update product",
    delete: "Delete Product",
    deleteDescription: "Confirm product deletion",
  },
  sumup: {
    sumup: "SumUp",
    checkouts: "SumUp Checkouts",
    transactions: "Transactions",
    transaction: {
      product_summary: "Summary",
      card_type: "Card Type",
      type: "Type",
    },
    checkout: {
      reference: "Checkout Reference",
      amount: "Amount",
      payment_type: "Payment Type",
      status: "Status",
      date: "Date",
    },
  },
  settings: {
    title: "Settings",
    language: "Language",
    updateEventSucessful: "Successfully updated event",
    updateEventFailed: "Updating the event failed: {{reason}}.",
    juristiction: "Juristiction",
    serverSideConfig: "Server side settings",
    localConfig: "Local settings",
    createEvent: {
      link: "Create new event",
      heading: "Create new event below {{parentNodeName}}",
    },
    createNode: {
      link: "Create new node",
      heading: "Create new node below {{parentNodeName}}",
    },
    archiveNode: {
      button: "Archive node",
      confirmTitle: "Confirm archive node",
      confirmContent:
        'Are you sure you want to archive the node "{{nodeName}}". This is irreversible and will prevent any changes from being made to this node.',
      success: "Sucessfully archived node",
      error: "Error while archiving node",
    },
    deleteNode: {
      button: "Delete node",
      confirmTitle: "Confirm delete node",
      confirmContent: 'Are you sure you want to delete the node "{{nodeName}}". This is irreversible!!!!!!!',
      success: "Sucessfully deleted node",
      error: "Error while deleting node",
    },
    general: {
      tabLabel: "General",
      name: "Name",
      description: "Description",
      forbidden_objects_at_node: "Forbidden objects at node",
      forbidden_objects_in_subtree: "Forbidden objects in subtree",
      ust_id: "UST ID",
      max_account_balance: "Max account balance",
      currency_identifier: "Currency Identifier",
      start_date: "Start Date",
      end_date: "End Date",
      daily_end_time: "Daily End Time",
      start_end_date_must_be_set_same: "Start and End Date must both be set or unset",
    },
    customerPortal: {
      tabLabel: "Customer Portal",
      baseUrl: "Base URL of Customer Portal",
      contact_email: "Contact E-Mail",
      data_privacy_url: "Data privacy URL",
      about_page_url: "About page URL",
    },
    pretix: {
      tabLabel: "Pretix",
      presaleEnabled: "Pretix presale enabled",
      baseUrl: "Base URL of Pretix instance",
      apiKey: "Pretix API Key",
      organizer: "Short name of pretix organizer",
      event: "Short name of pretix event",
      ticketIds: 'Ticket IDs in pretix event, separated by ","',
      checkConnection: "Check Connection",
      checkSuccessful: "Pretix integration configured correctly",
      checkFailed: "Pretix integration configured incorrectly",
      generateWebhook: "Generate webhook url for live pretix updates",
      webhookGenerated: "Successfully setup webhook",
      webhookUrlFailed: "Failed to setup webhook",
    },
    agb: {
      tabLabel: "AGB",
      preview: "Show Preview",
      content: "AGB (in markdown formatting)",
    },
    faq: {
      tabLabel: "FAQ",
      preview: "Show Preview",
      content: "FAQ (in markdown formatting)",
    },
    bon: {
      tabLabel: "Bon",
      issuer: "Bon issuer",
      address: "Bon address",
      title: "Bon title",
      previewBon: "Preview Bon",
      previewReport: "Preview Revenue Report",
    },
    sumup: {
      tabLabel: "SumUp",
      sumup_payment_enabled: "SumUp Payment Enabled",
      sumup_topup_enabled: "SumUp Top Up Enabled",
      sumup_api_key: "SumUp API Key",
      sumup_merchant_code: "SumUp Merchant Code",
      sumup_affiliate_key: "SumUp Affiliate Key",
      sumup_oauth_client_id: "SumUp OAuth Client ID",
      sumup_oauth_client_secret: "SumUp OAuth Client Secret",
      sumup_redirect_url: "This is the sumup redirect url: {{redirectUrl}}",
      login_with_sumup: "Login with sumup",
    },
    payout: {
      tabLabel: "Payout",
      sepa_enabled: "Payout enabled",
      ibanNotValid: "IBAN is not valid",
      sepa_sender_name: "SEPA sender name",
      sepa_sender_iban: "SEPA sender IBAN",
      sepa_description: "SEPA description",
      sepa_allowed_country_codes: "Allowed country codes for payout",
      payout_done_subject: "Subject of mail sent upon setting a payout to done",
      payout_done_message: "Message of mail sent upon setting a payout to done",
      payout_registered_subject: "Subject of mail sent when a customer enters their payout information",
      payout_registered_message: "Message of mail sent when a customer enters their payout information",
      payout_sender: "E-Mail sender of all payout related emails. If empty the event email sender will be used",
    },
    email: {
      tabLabel: "E-Mail",
      enabled: "Email enabled",
      default_sender: "Default sender mail address",
      smtp_host: "SMTP Host",
      smtp_port: "SMTP Port",
      smtp_username: "SMTP Username",
      smtp_password: "SMTP Password",
    },
    settingsUpdateError: "Error updating setting: {{what}}",
    theme: {
      title: "Theme",
      browser: "Browser",
      dark: "Dark",
      light: "Light",
    },
  },
  taxRateName: "Name",
  taxRateRate: "Rate",
  taxRateDescription: "Description",
  createTaxRate: "Add a new Tax Rate",
  updateTaxRate: "Update Tax Rate",
  deleteTaxRate: "Delete Tax Rate",
  deleteTaxRateDescription: "Confirm tax rate deletion",
  till: {
    till: "Till",
    tills: "Tills",
    id: "ID",
    name: "Name",
    profile: "Profile",
    description: "Description",
    registrationUUID: "Registration ID",
    loggedIn: "Terminal registered",
    logout: "Unregister till",
    cashRegisterBalance: "Current cash register balance",
    cashRegisterName: "Current cash register name",
    create: "Add a new till",
    update: "Update till",
    delete: "Delete till",
    deleteDescription: "Confirm till deletion",
    terminal: "Terminal",
    activeUser: "Logged in user",
    tseId: "TSE ID",
    tseSerial: "TSE Serial",
    forceLogoutUser: "Force logout user",
    forceLogoutUserDescription:
      "Force logout user at terminal. This should NEVER be done while a cashier is still using the terminal",
    unregisterTill: "Force logout a terminal",
    unregisterTillDescription:
      "Force logout a terminal. This should NEVER be done while a cashier is still using the terminal",
    removeFromTerminal: "Remove from terminal",
    removeFromTerminalDescription: "Deassociate a this till from its terminal",
    switchTerminal: "Switch terminal",
    switchTerminalDescription:
      "Switch the terminal associated with this till. This should NEVER be done while a cashier is still using the terminal",
  },
  layout: {
    layout: "Layout",
    layouts: "Layouts",
    buttons: "Buttons",
    tickets: "Tickets",
    name: "Name",
    description: "Description",
    create: "Add a new layout",
    update: "Update layout",
    delete: "Delete layout",
    deleteDescription: "Confirm layout deletion",
  },
  profile: {
    profile: "Profile",
    profiles: "Profiles",
    name: "Name",
    description: "Description",
    create: "Add a new profile",
    allowTopUp: "Allow top up",
    allowCashOut: "Allow cash out",
    allowTicketSale: "Allow ticket sales",
    allowTicketVouchers: "Allow presale ticket vouchers",
    enableSspPayment: "Enable payment of products with SSP",
    enableCashPayment: "Enable payment of products with cash",
    enableCardPayment: "Enable payment of products with card",
    allowedUserRoles: "Allowed user roles",
    layout: "Layout",
    update: "Update profile",
    delete: "Delete profile",
    deleteDescription: "Confirm profile deletion",
  },
  button: {
    button: "Button",
    buttons: "Buttons",
    create: "Add a new button",
    update: "Update button",
    delete: "Delete button",
    deleteDescription: "Confirm button deletion",
    availableButtons: "Available buttons",
    assignedButtons: "Assigned buttons",
    name: "Name",
    price: "Price",
    addProductToButton: "Add a product",
  },
  register: {
    stockings: "Cash register stockings",
    createStocking: "Add a new cash register stocking template",
    updateStocking: "Update a cash register stocking template",
    deleteStocking: "Update a cash register stocking template",
    deleteStockingDescription: "Confirm register stocking deletion",
    createRegister: "Add a new cash register",
    updateRegister: "Update a cash register",
    deleteRegister: "Update a cash register",
    deleteRegisterDescription: "Confirm register deletion",
    registers: "Registers",
    currentBalance: "Balance",
    currentCashier: "Cashier",
    currentTill: "Till",
    update: "Update cash register",
    cashierShifts: "Cashier Shifts",
    name: "Name",
    transfer: "Transfer to another cashier",
    transferTargetCashier: "Cashier to transfer the register to",
    cannotTransferNotAssigned:
      "This cash register is not assigned to a cashier, we therefore cannot transfer it to another. Please use the stock up cashier functionality for that.",
    euro200: "Amount of 200€ bills",
    euro100: "Amount of 100€ bills",
    euro50: "Amount of 50€ bills",
    euro20: "Amount of 20€ bills",
    euro10: "Amount of 10€ bills",
    euro5: "Amount of 5€ bills",
    euro2: "Amount of 2€ rolls  one roll = 25 pcs = 50€",
    euro1: "Amount of 1€ rolls, one roll = 25 pcs = 25€",
    cent50: "Amount of 50 cent rolls, one roll = 40 pcs = 20€",
    cent20: "Amount of 20 cent rolls, one roll = 40 pcs = 8€",
    cent10: "Amount of 10 cent rolls, one roll = 40 pcs = 4€",
    cent5: "Amount of 5 cent rolls, one roll = 50 pcs = 2,50€",
    cent2: "Amount of 2 cent rolls, one roll = 50 pcs = 1€",
    cent1: "Amount of 1 cent rolls, one roll = 50 pcs = 0,50€",
    variableInEuro: "Additional variable stocking in euro",
    stockingTotal: "Total",
    activity: "Activity",
    orders: "Orders",
  },
  createUser: "Create User",
  updateUser: "Update User",
  userLogin: "Login",
  userDisplayName: "Display Name",
  userPassword: "Password",
  userDescription: "Description",
  userPrivileges: "Privileges",
  userCreateError: "Error while creating user: {{what}}",
  userUpdateError: "Error while updating user: {{what}}",
  deleteUser: "Delete User",
  deleteUserDescription: "Confirm user deletion",
  user: {
    user: "User",
    users: "Users",
    roles: "Roles",
    login: "Login",
    displayName: "Display Name",
    description: "Description",
    tagId: "User Tag ID",
    noTagAssigned: "No Tag assigned",
    changePassword: {
      title: "Change password",
      new_password: "New Password",
      new_password_confirm: "Confirm New Password",
    },
    cashierDetails: "Cashier Details",
  },
  userRole: {
    name: "Name",
    create: "Create new user role",
    update: "Update user role",
    isPrivileged: "Is privileged",
    createError: "Error while creating user role: {{what}}",
    updateError: "Error while updating user role: {{what}}",
    privileges: "Privileges",
    delete: "Delete user role",
    deleteDescription: "Confirm user role deletion",
  },
  userToRole: {
    user: "User",
    role: "Role",
    create: "Associate a user to a role for node {{node}}",
    deleteAssociation: "Remove Role association",
    deleteAssociationDescription: "Remove association",
  },
  tse: {
    tses: "TSE",
    name: "Name",
    type: "Type",
    status: "Status",
    serial: "Serial",
    create: "Create a new TSE",
    wsUrl: "Websocket URL",
    wsTimeout: "Websocket Timeout in seconds",
    password: "TSE Password",
    hashalgo: "Hash Algorithm",
    timeFormat: "Time Format",
    publicKey: "Public Key",
    certificate: "Certificate",
    processDataEncoding: "Data Encoding",
  },
  payoutRun: {
    id: "ID",
    pendingPayoutDetails: "Overview of customers which do not have an assigned payout run",
    maxPayoutSum: "Max amount to be paid out in this payout run",
    maxNumPayouts: "Max number of payouts in a run",
    maxNumPayoutsMustBeSmallerThanEventDefault:
      "Max number of payouts must be smaller than the default configured for an event: {{maxNumPayoutsAtEvent}}",
    downloadCsv: "CSV",
    createNewSepaXmlInfo: "This will regenerate the sepa xml of this payout run with the given execution date set.",
    downloadPreviousSepa: "Previous SEPA XML",
    downloadSepa: "SEPA XML",
    done: "Done",
    setDone: "Set as done",
    setDoneExplanation:
      "This will mark the payout run as done. Customers will get notifications and their account balances will be updated with the payout amounts",
    setDoneAt: "Set to done at",
    setDoneBy: "Set to done by",
    revoke: "Revoke",
    revokeExplanation:
      "This will delete the payout run. Already generated sepa exports and csv files will be kept but customers will be deassociated from this payout.",
    revoked: "Revoked",
    downloadSepaModalTitle: "Download SEPA XML",
    batchSize: "Batch Size",
    create: "Create a new payout run",
    createdAt: "Created At",
    createdBy: "Created By",
    executionDate: "Execution Date",
    totalPayoutAmount: "Total Payout Amount",
    totalDonationAmount: "Total Donation Amount",
    nPayouts: "Num. Payouts",
    payoutRuns: "Payout Runs",
    payoutsInPayoutRun: "Customers to be paid out in this payout run",
    payout: {
      id: "Account ID",
    },
  },
  customer: {
    search: "Search for Customers",
    customers: "Customers",
    bankAccountHolder: "Account holder",
    donation: "Donation",
    payoutRun: "Payout Run",
    payoutExportPrevented: "This customer is excluded from any payout runs",
    preventPayout: "Prevent Payout",
    allowPayout: "Allow Payout",
    payoutAmount: "Payout amount",
    detailsInPayoutRun: "Details as included in the payout run",
    noPayoutRunAssigned: "No payout run assigned",
    noPayoutError: "No payout error",
    payoutRunError: "Error during payout",
    iban: "IBAN",
    hasEnteredInfo: "Has entered payout information",
    donateAll: "Donates all of their remaining balance",
  },
  terminal: {
    terminals: "Terminals",
    till: "Till",
    id: "ID",
    registrationUUID: "Registration ID",
    loggedIn: "Terminal registered",
    logout: "Unregister Terminal",
    create: "Add a new terminal",
    update: "Update terminal",
    delete: "Delete terminal",
    deleteDescription: "Confirm Terminal deletion",
    forceLogoutUserDescription:
      "Force logout user at terminal. This should NEVER be done while a cashier is still using the terminal",
    unregisterTerminal: "Force logout a terminal",
    unregisterTerminalDescription:
      "Force logout a terminal. This should NEVER be done while a cashier is still using the terminal",
    removeTill: "Remove till",
    removeTillDescription:
      'Deassociate till "{{tillName}}" from this terminal. This should NEVER be done while a cashier is still using the terminal.',
    switchTill: "Switch till",
    switchTillDescription:
      "Switch the till associated with this terminal. This should NEVER be done while a cashier is still using the terminal.",
  },
};

export type Translations = typeof translations;

export default translations;
