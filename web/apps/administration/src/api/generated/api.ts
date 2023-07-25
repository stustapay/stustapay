import { emptySplitApi as api } from "./emptyApi";
export const addTagTypes = [
  "products",
  "users",
  "user-roles",
  "tax-rates",
  "auth",
  "tills",
  "till-layouts",
  "till-profiles",
  "till-buttons",
  "till-register-stockings",
  "till-registers",
  "config",
  "accounts",
  "orders",
  "cashiers",
  "stats",
  "tickets",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      listProducts: build.query<ListProductsApiResponse, ListProductsApiArg>({
        query: () => ({ url: `/products` }),
        providesTags: ["products"],
      }),
      createProduct: build.mutation<CreateProductApiResponse, CreateProductApiArg>({
        query: (queryArg) => ({ url: `/products`, method: "POST", body: queryArg.newProduct }),
        invalidatesTags: ["products"],
      }),
      getProduct: build.query<GetProductApiResponse, GetProductApiArg>({
        query: (queryArg) => ({ url: `/products/${queryArg.productId}` }),
        providesTags: ["products"],
      }),
      updateProduct: build.mutation<UpdateProductApiResponse, UpdateProductApiArg>({
        query: (queryArg) => ({ url: `/products/${queryArg.productId}`, method: "POST", body: queryArg.newProduct }),
        invalidatesTags: ["products"],
      }),
      deleteProduct: build.mutation<DeleteProductApiResponse, DeleteProductApiArg>({
        query: (queryArg) => ({ url: `/products/${queryArg.productId}`, method: "DELETE" }),
        invalidatesTags: ["products"],
      }),
      listUsers: build.query<ListUsersApiResponse, ListUsersApiArg>({
        query: () => ({ url: `/users` }),
        providesTags: ["users"],
      }),
      createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
        query: (queryArg) => ({ url: `/users`, method: "POST", body: queryArg.createUserPayload }),
        invalidatesTags: ["users"],
      }),
      getUser: build.query<GetUserApiResponse, GetUserApiArg>({
        query: (queryArg) => ({ url: `/users/${queryArg.userId}` }),
        providesTags: ["users"],
      }),
      updateUser: build.mutation<UpdateUserApiResponse, UpdateUserApiArg>({
        query: (queryArg) => ({ url: `/users/${queryArg.userId}`, method: "POST", body: queryArg.updateUserPayload }),
        invalidatesTags: ["users"],
      }),
      deleteUser: build.mutation<DeleteUserApiResponse, DeleteUserApiArg>({
        query: (queryArg) => ({ url: `/users/${queryArg.userId}`, method: "DELETE" }),
        invalidatesTags: ["users"],
      }),
      listUserRoles: build.query<ListUserRolesApiResponse, ListUserRolesApiArg>({
        query: () => ({ url: `/user-roles` }),
        providesTags: ["user-roles"],
      }),
      createUserRole: build.mutation<CreateUserRoleApiResponse, CreateUserRoleApiArg>({
        query: (queryArg) => ({ url: `/user-roles`, method: "POST", body: queryArg.newUserRole }),
        invalidatesTags: ["user-roles"],
      }),
      updateUserRole: build.mutation<UpdateUserRoleApiResponse, UpdateUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles/${queryArg.userRoleId}`,
          method: "POST",
          body: queryArg.updateUserRolePrivilegesPayload,
        }),
        invalidatesTags: ["user-roles"],
      }),
      deleteUserRole: build.mutation<DeleteUserRoleApiResponse, DeleteUserRoleApiArg>({
        query: (queryArg) => ({ url: `/user-roles/${queryArg.userRoleId}`, method: "DELETE" }),
        invalidatesTags: ["user-roles"],
      }),
      listTaxRates: build.query<ListTaxRatesApiResponse, ListTaxRatesApiArg>({
        query: () => ({ url: `/tax-rates` }),
        providesTags: ["tax-rates"],
      }),
      createTaxRate: build.mutation<CreateTaxRateApiResponse, CreateTaxRateApiArg>({
        query: (queryArg) => ({ url: `/tax-rates`, method: "POST", body: queryArg.taxRate }),
        invalidatesTags: ["tax-rates"],
      }),
      getTaxRate: build.query<GetTaxRateApiResponse, GetTaxRateApiArg>({
        query: (queryArg) => ({ url: `/tax-rates/${queryArg.taxRateName}` }),
        providesTags: ["tax-rates"],
      }),
      updateTaxRate: build.mutation<UpdateTaxRateApiResponse, UpdateTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateName}`,
          method: "POST",
          body: queryArg.taxRateWithoutName,
        }),
        invalidatesTags: ["tax-rates"],
      }),
      deleteTaxRate: build.mutation<DeleteTaxRateApiResponse, DeleteTaxRateApiArg>({
        query: (queryArg) => ({ url: `/tax-rates/${queryArg.taxRateName}`, method: "DELETE" }),
        invalidatesTags: ["tax-rates"],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({ url: `/auth/login`, method: "POST", body: queryArg.bodyLoginAuthLoginPost }),
        invalidatesTags: ["auth"],
      }),
      changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
        query: (queryArg) => ({ url: `/auth/change-password`, method: "POST", body: queryArg.changePasswordPayload }),
        invalidatesTags: ["auth"],
      }),
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/auth/logout`, method: "POST" }),
        invalidatesTags: ["auth"],
      }),
      listTills: build.query<ListTillsApiResponse, ListTillsApiArg>({
        query: () => ({ url: `/tills` }),
        providesTags: ["tills"],
      }),
      createTill: build.mutation<CreateTillApiResponse, CreateTillApiArg>({
        query: (queryArg) => ({ url: `/tills`, method: "POST", body: queryArg.newTill }),
        invalidatesTags: ["tills"],
      }),
      getTill: build.query<GetTillApiResponse, GetTillApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}` }),
        providesTags: ["tills"],
      }),
      updateTill: build.mutation<UpdateTillApiResponse, UpdateTillApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}`, method: "POST", body: queryArg.newTill }),
        invalidatesTags: ["tills"],
      }),
      deleteTill: build.mutation<DeleteTillApiResponse, DeleteTillApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}`, method: "DELETE" }),
        invalidatesTags: ["tills"],
      }),
      logoutTill: build.mutation<LogoutTillApiResponse, LogoutTillApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}/logout`, method: "POST" }),
        invalidatesTags: ["tills"],
      }),
      forceLogoutUser: build.mutation<ForceLogoutUserApiResponse, ForceLogoutUserApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}/force-logout-user`, method: "POST" }),
        invalidatesTags: ["tills"],
      }),
      listTillLayouts: build.query<ListTillLayoutsApiResponse, ListTillLayoutsApiArg>({
        query: () => ({ url: `/till-layouts` }),
        providesTags: ["till-layouts"],
      }),
      createTillLayout: build.mutation<CreateTillLayoutApiResponse, CreateTillLayoutApiArg>({
        query: (queryArg) => ({ url: `/till-layouts`, method: "POST", body: queryArg.newTillLayout }),
        invalidatesTags: ["till-layouts"],
      }),
      getTillLayout: build.query<GetTillLayoutApiResponse, GetTillLayoutApiArg>({
        query: (queryArg) => ({ url: `/till-layouts/${queryArg.layoutId}` }),
        providesTags: ["till-layouts"],
      }),
      updateTillLayout: build.mutation<UpdateTillLayoutApiResponse, UpdateTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          method: "POST",
          body: queryArg.newTillLayout,
        }),
        invalidatesTags: ["till-layouts"],
      }),
      deleteTillLayout: build.mutation<DeleteTillLayoutApiResponse, DeleteTillLayoutApiArg>({
        query: (queryArg) => ({ url: `/till-layouts/${queryArg.layoutId}`, method: "DELETE" }),
        invalidatesTags: ["till-layouts"],
      }),
      listTillProfiles: build.query<ListTillProfilesApiResponse, ListTillProfilesApiArg>({
        query: () => ({ url: `/till-profiles` }),
        providesTags: ["till-profiles"],
      }),
      createTillProfile: build.mutation<CreateTillProfileApiResponse, CreateTillProfileApiArg>({
        query: (queryArg) => ({ url: `/till-profiles`, method: "POST", body: queryArg.newTillProfile }),
        invalidatesTags: ["till-profiles"],
      }),
      getTillProfile: build.query<GetTillProfileApiResponse, GetTillProfileApiArg>({
        query: (queryArg) => ({ url: `/till-profiles/${queryArg.profileId}` }),
        providesTags: ["till-profiles"],
      }),
      updateTillProfile: build.mutation<UpdateTillProfileApiResponse, UpdateTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          method: "POST",
          body: queryArg.newTillProfile,
        }),
        invalidatesTags: ["till-profiles"],
      }),
      deleteTillProfile: build.mutation<DeleteTillProfileApiResponse, DeleteTillProfileApiArg>({
        query: (queryArg) => ({ url: `/till-profiles/${queryArg.profileId}`, method: "DELETE" }),
        invalidatesTags: ["till-profiles"],
      }),
      listTillButtons: build.query<ListTillButtonsApiResponse, ListTillButtonsApiArg>({
        query: () => ({ url: `/till-buttons` }),
        providesTags: ["till-buttons"],
      }),
      createTillButton: build.mutation<CreateTillButtonApiResponse, CreateTillButtonApiArg>({
        query: (queryArg) => ({ url: `/till-buttons`, method: "POST", body: queryArg.newTillButton }),
        invalidatesTags: ["till-buttons"],
      }),
      getTillButton: build.query<GetTillButtonApiResponse, GetTillButtonApiArg>({
        query: (queryArg) => ({ url: `/till-buttons/${queryArg.buttonId}` }),
        providesTags: ["till-buttons"],
      }),
      updateTillButton: build.mutation<UpdateTillButtonApiResponse, UpdateTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          method: "POST",
          body: queryArg.newTillButton,
        }),
        invalidatesTags: ["till-buttons"],
      }),
      deleteTillButton: build.mutation<DeleteTillButtonApiResponse, DeleteTillButtonApiArg>({
        query: (queryArg) => ({ url: `/till-buttons/${queryArg.buttonId}`, method: "DELETE" }),
        invalidatesTags: ["till-buttons"],
      }),
      listRegisterStockings: build.query<ListRegisterStockingsApiResponse, ListRegisterStockingsApiArg>({
        query: () => ({ url: `/till-register-stockings` }),
        providesTags: ["till-register-stockings"],
      }),
      createRegisterStocking: build.mutation<CreateRegisterStockingApiResponse, CreateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      updateRegisterStocking: build.mutation<UpdateRegisterStockingApiResponse, UpdateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings/${queryArg.stockingId}`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      deleteRegisterStocking: build.mutation<DeleteRegisterStockingApiResponse, DeleteRegisterStockingApiArg>({
        query: (queryArg) => ({ url: `/till-register-stockings/${queryArg.stockingId}`, method: "DELETE" }),
        invalidatesTags: ["till-register-stockings"],
      }),
      listCashRegistersAdmin: build.query<ListCashRegistersAdminApiResponse, ListCashRegistersAdminApiArg>({
        query: () => ({ url: `/till-registers` }),
        providesTags: ["till-registers"],
      }),
      createRegister: build.mutation<CreateRegisterApiResponse, CreateRegisterApiArg>({
        query: (queryArg) => ({ url: `/till-registers`, method: "POST", body: queryArg.newCashRegister }),
        invalidatesTags: ["till-registers"],
      }),
      transferRegister: build.mutation<TransferRegisterApiResponse, TransferRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/transfer-register`,
          method: "POST",
          body: queryArg.transferRegisterPayload,
        }),
        invalidatesTags: ["till-registers"],
      }),
      updateRegister: build.mutation<UpdateRegisterApiResponse, UpdateRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          method: "POST",
          body: queryArg.newCashRegister,
        }),
        invalidatesTags: ["till-registers"],
      }),
      deleteRegister: build.mutation<DeleteRegisterApiResponse, DeleteRegisterApiArg>({
        query: (queryArg) => ({ url: `/till-registers/${queryArg.registerId}`, method: "DELETE" }),
        invalidatesTags: ["till-registers"],
      }),
      getPublicConfig: build.query<GetPublicConfigApiResponse, GetPublicConfigApiArg>({
        query: () => ({ url: `/public-config` }),
        providesTags: ["config"],
      }),
      listConfigEntries: build.query<ListConfigEntriesApiResponse, ListConfigEntriesApiArg>({
        query: () => ({ url: `/config` }),
        providesTags: ["config"],
      }),
      setConfigEntry: build.mutation<SetConfigEntryApiResponse, SetConfigEntryApiArg>({
        query: (queryArg) => ({ url: `/config`, method: "POST", body: queryArg.configEntry }),
        invalidatesTags: ["config"],
      }),
      listSystemAccounts: build.query<ListSystemAccountsApiResponse, ListSystemAccountsApiArg>({
        query: () => ({ url: `/system-accounts` }),
        providesTags: ["accounts"],
      }),
      findAccounts: build.mutation<FindAccountsApiResponse, FindAccountsApiArg>({
        query: (queryArg) => ({ url: `/accounts/find-accounts`, method: "POST", body: queryArg.findAccountPayload }),
        invalidatesTags: ["accounts"],
      }),
      getAccount: build.query<GetAccountApiResponse, GetAccountApiArg>({
        query: (queryArg) => ({ url: `/accounts/${queryArg.accountId}` }),
        providesTags: ["accounts"],
      }),
      disableAccount: build.mutation<DisableAccountApiResponse, DisableAccountApiArg>({
        query: (queryArg) => ({ url: `/accounts/${queryArg.accountId}/disable`, method: "POST" }),
        invalidatesTags: ["accounts"],
      }),
      updateBalance: build.mutation<UpdateBalanceApiResponse, UpdateBalanceApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-balance`,
          method: "POST",
          body: queryArg.updateBalancePayload,
        }),
        invalidatesTags: ["accounts"],
      }),
      updateVoucherAmount: build.mutation<UpdateVoucherAmountApiResponse, UpdateVoucherAmountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-voucher-amount`,
          method: "POST",
          body: queryArg.updateVoucherAmountPayload,
        }),
        invalidatesTags: ["accounts"],
      }),
      updateTagUid: build.mutation<UpdateTagUidApiResponse, UpdateTagUidApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-tag-uid`,
          method: "POST",
          body: queryArg.updateTagUidPayload,
        }),
        invalidatesTags: ["accounts"],
      }),
      updateAccountComment: build.mutation<UpdateAccountCommentApiResponse, UpdateAccountCommentApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-comment`,
          method: "POST",
          body: queryArg.updateAccountCommentPayload,
        }),
        invalidatesTags: ["accounts"],
      }),
      getUserTagDetail: build.query<GetUserTagDetailApiResponse, GetUserTagDetailApiArg>({
        query: (queryArg) => ({ url: `/user-tags/${queryArg.userTagUidHex}` }),
        providesTags: ["accounts"],
      }),
      updateUserTagComment: build.mutation<UpdateUserTagCommentApiResponse, UpdateUserTagCommentApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagUidHex}/update-comment`,
          method: "POST",
          body: queryArg.updateCommentPayload,
        }),
        invalidatesTags: ["accounts"],
      }),
      listOrdersByTill: build.query<ListOrdersByTillApiResponse, ListOrdersByTillApiArg>({
        query: (queryArg) => ({ url: `/orders/by-till/${queryArg.tillId}` }),
        providesTags: ["orders"],
      }),
      listOrders: build.query<ListOrdersApiResponse, ListOrdersApiArg>({
        query: (queryArg) => ({ url: `/orders`, params: { customer_account_id: queryArg.customerAccountId } }),
        providesTags: ["orders"],
      }),
      getOrder: build.query<GetOrderApiResponse, GetOrderApiArg>({
        query: (queryArg) => ({ url: `/orders/${queryArg.orderId}` }),
        providesTags: ["orders"],
      }),
      cancelOrder: build.mutation<CancelOrderApiResponse, CancelOrderApiArg>({
        query: (queryArg) => ({ url: `/orders/${queryArg.orderId}`, method: "DELETE" }),
        invalidatesTags: ["orders"],
      }),
      editOrder: build.mutation<EditOrderApiResponse, EditOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}/edit`,
          method: "POST",
          body: queryArg.editSaleProducts,
        }),
        invalidatesTags: ["orders"],
      }),
      listCashiers: build.query<ListCashiersApiResponse, ListCashiersApiArg>({
        query: () => ({ url: `/cashiers` }),
        providesTags: ["cashiers"],
      }),
      getCashier: build.query<GetCashierApiResponse, GetCashierApiArg>({
        query: (queryArg) => ({ url: `/cashiers/${queryArg.cashierId}` }),
        providesTags: ["cashiers"],
      }),
      getCashierShifts: build.query<GetCashierShiftsApiResponse, GetCashierShiftsApiArg>({
        query: (queryArg) => ({ url: `/cashiers/${queryArg.cashierId}/shifts` }),
        providesTags: ["cashiers"],
      }),
      getCashierShiftStats: build.query<GetCashierShiftStatsApiResponse, GetCashierShiftStatsApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/shift-stats`,
          params: { shift_id: queryArg.shiftId },
        }),
        providesTags: ["cashiers"],
      }),
      closeOutCashier: build.mutation<CloseOutCashierApiResponse, CloseOutCashierApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/close-out`,
          method: "POST",
          body: queryArg.closeOut,
        }),
        invalidatesTags: ["cashiers"],
      }),
      getProductStats: build.query<GetProductStatsApiResponse, GetProductStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/products`,
          params: { to_timestamp: queryArg.toTimestamp, from_timestamp: queryArg.fromTimestamp },
        }),
        providesTags: ["stats"],
      }),
      listTickets: build.query<ListTicketsApiResponse, ListTicketsApiArg>({
        query: () => ({ url: `/tickets` }),
        providesTags: ["tickets"],
      }),
      createTicket: build.mutation<CreateTicketApiResponse, CreateTicketApiArg>({
        query: (queryArg) => ({ url: `/tickets`, method: "POST", body: queryArg.newTicket }),
        invalidatesTags: ["tickets"],
      }),
      getTicket: build.query<GetTicketApiResponse, GetTicketApiArg>({
        query: (queryArg) => ({ url: `/tickets/${queryArg.ticketId}` }),
        providesTags: ["tickets"],
      }),
      updateTicket: build.mutation<UpdateTicketApiResponse, UpdateTicketApiArg>({
        query: (queryArg) => ({ url: `/tickets/${queryArg.ticketId}`, method: "POST", body: queryArg.newTicket }),
        invalidatesTags: ["tickets"],
      }),
      deleteTicket: build.mutation<DeleteTicketApiResponse, DeleteTicketApiArg>({
        query: (queryArg) => ({ url: `/tickets/${queryArg.ticketId}`, method: "DELETE" }),
        invalidatesTags: ["tickets"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type ListProductsApiResponse = /** status 200 Successful Response */ NormalizedListProductInt;
export type ListProductsApiArg = void;
export type CreateProductApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductApiArg = {
  newProduct: NewProduct;
};
export type GetProductApiResponse = /** status 200 Successful Response */ Product;
export type GetProductApiArg = {
  productId: number;
};
export type UpdateProductApiResponse = /** status 200 Successful Response */ Product;
export type UpdateProductApiArg = {
  productId: number;
  newProduct: NewProduct;
};
export type DeleteProductApiResponse = /** status 200 Successful Response */ any;
export type DeleteProductApiArg = {
  productId: number;
};
export type ListUsersApiResponse = /** status 200 Successful Response */ NormalizedListUserInt;
export type ListUsersApiArg = void;
export type CreateUserApiResponse = /** status 200 Successful Response */ User;
export type CreateUserApiArg = {
  createUserPayload: CreateUserPayload;
};
export type GetUserApiResponse = /** status 200 Successful Response */ User;
export type GetUserApiArg = {
  userId: number;
};
export type UpdateUserApiResponse = /** status 200 Successful Response */ User;
export type UpdateUserApiArg = {
  userId: number;
  updateUserPayload: UpdateUserPayload;
};
export type DeleteUserApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserApiArg = {
  userId: number;
};
export type ListUserRolesApiResponse = /** status 200 Successful Response */ NormalizedListUserRoleInt;
export type ListUserRolesApiArg = void;
export type CreateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type CreateUserRoleApiArg = {
  newUserRole: NewUserRole;
};
export type UpdateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type UpdateUserRoleApiArg = {
  userRoleId: number;
  updateUserRolePrivilegesPayload: UpdateUserRolePrivilegesPayload;
};
export type DeleteUserRoleApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserRoleApiArg = {
  userRoleId: number;
};
export type ListTaxRatesApiResponse = /** status 200 Successful Response */ NormalizedListTaxRateStr;
export type ListTaxRatesApiArg = void;
export type CreateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type CreateTaxRateApiArg = {
  taxRate: TaxRate;
};
export type GetTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type GetTaxRateApiArg = {
  taxRateName: string;
};
export type UpdateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type UpdateTaxRateApiArg = {
  taxRateName: string;
  taxRateWithoutName: TaxRateWithoutName;
};
export type DeleteTaxRateApiResponse = /** status 200 Successful Response */ any;
export type DeleteTaxRateApiArg = {
  taxRateName: string;
};
export type LoginApiResponse = /** status 200 Successful Response */ LoginResponse;
export type LoginApiArg = {
  bodyLoginAuthLoginPost: BodyLoginAuthLoginPost;
};
export type ChangePasswordApiResponse = /** status 200 Successful Response */ any;
export type ChangePasswordApiArg = {
  changePasswordPayload: ChangePasswordPayload;
};
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type ListTillsApiResponse = /** status 200 Successful Response */ NormalizedListTillInt;
export type ListTillsApiArg = void;
export type CreateTillApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillApiArg = {
  newTill: NewTill;
};
export type GetTillApiResponse = /** status 200 Successful Response */ Till;
export type GetTillApiArg = {
  tillId: number;
};
export type UpdateTillApiResponse = /** status 200 Successful Response */ Till;
export type UpdateTillApiArg = {
  tillId: number;
  newTill: NewTill;
};
export type DeleteTillApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillApiArg = {
  tillId: number;
};
export type LogoutTillApiResponse = /** status 200 Successful Response */ any;
export type LogoutTillApiArg = {
  tillId: number;
};
export type ForceLogoutUserApiResponse = /** status 200 Successful Response */ any;
export type ForceLogoutUserApiArg = {
  tillId: number;
};
export type ListTillLayoutsApiResponse = /** status 200 Successful Response */ NormalizedListTillLayoutInt;
export type ListTillLayoutsApiArg = void;
export type CreateTillLayoutApiResponse = /** status 200 Successful Response */ NewTillLayout;
export type CreateTillLayoutApiArg = {
  newTillLayout: NewTillLayout;
};
export type GetTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type GetTillLayoutApiArg = {
  layoutId: number;
};
export type UpdateTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type UpdateTillLayoutApiArg = {
  layoutId: number;
  newTillLayout: NewTillLayout;
};
export type DeleteTillLayoutApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillLayoutApiArg = {
  layoutId: number;
};
export type ListTillProfilesApiResponse = /** status 200 Successful Response */ NormalizedListTillProfileInt;
export type ListTillProfilesApiArg = void;
export type CreateTillProfileApiResponse = /** status 200 Successful Response */ NewTillProfile;
export type CreateTillProfileApiArg = {
  newTillProfile: NewTillProfile;
};
export type GetTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type GetTillProfileApiArg = {
  profileId: number;
};
export type UpdateTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type UpdateTillProfileApiArg = {
  profileId: number;
  newTillProfile: NewTillProfile;
};
export type DeleteTillProfileApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillProfileApiArg = {
  profileId: number;
};
export type ListTillButtonsApiResponse = /** status 200 Successful Response */ NormalizedListTillButtonInt;
export type ListTillButtonsApiArg = void;
export type CreateTillButtonApiResponse = /** status 200 Successful Response */ NewTillButton;
export type CreateTillButtonApiArg = {
  newTillButton: NewTillButton;
};
export type GetTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type GetTillButtonApiArg = {
  buttonId: number;
};
export type UpdateTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type UpdateTillButtonApiArg = {
  buttonId: number;
  newTillButton: NewTillButton;
};
export type DeleteTillButtonApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillButtonApiArg = {
  buttonId: number;
};
export type ListRegisterStockingsApiResponse =
  /** status 200 Successful Response */ NormalizedListCashRegisterStockingInt;
export type ListRegisterStockingsApiArg = void;
export type CreateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type CreateRegisterStockingApiArg = {
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type UpdateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type UpdateRegisterStockingApiArg = {
  stockingId: number;
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type DeleteRegisterStockingApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterStockingApiArg = {
  stockingId: number;
};
export type ListCashRegistersAdminApiResponse = /** status 200 Successful Response */ NormalizedListCashRegisterInt;
export type ListCashRegistersAdminApiArg = void;
export type CreateRegisterApiResponse = /** status 200 Successful Response */ CashRegister;
export type CreateRegisterApiArg = {
  newCashRegister: NewCashRegister;
};
export type TransferRegisterApiResponse = /** status 200 Successful Response */ any;
export type TransferRegisterApiArg = {
  transferRegisterPayload: TransferRegisterPayload;
};
export type UpdateRegisterApiResponse = /** status 200 Successful Response */ any;
export type UpdateRegisterApiArg = {
  registerId: number;
  newCashRegister: NewCashRegister;
};
export type DeleteRegisterApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterApiArg = {
  registerId: number;
};
export type GetPublicConfigApiResponse = /** status 200 Successful Response */ Config;
export type GetPublicConfigApiArg = void;
export type ListConfigEntriesApiResponse = /** status 200 Successful Response */ NormalizedListConfigEntryStr;
export type ListConfigEntriesApiArg = void;
export type SetConfigEntryApiResponse = /** status 200 Successful Response */ ConfigEntry;
export type SetConfigEntryApiArg = {
  configEntry: ConfigEntry;
};
export type ListSystemAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type ListSystemAccountsApiArg = void;
export type FindAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type FindAccountsApiArg = {
  findAccountPayload: FindAccountPayload;
};
export type GetAccountApiResponse = /** status 200 Successful Response */ Account;
export type GetAccountApiArg = {
  accountId: number;
};
export type DisableAccountApiResponse = /** status 200 Successful Response */ any;
export type DisableAccountApiArg = {
  accountId: number;
};
export type UpdateBalanceApiResponse = /** status 200 Successful Response */ any;
export type UpdateBalanceApiArg = {
  accountId: number;
  updateBalancePayload: UpdateBalancePayload;
};
export type UpdateVoucherAmountApiResponse = /** status 200 Successful Response */ any;
export type UpdateVoucherAmountApiArg = {
  accountId: number;
  updateVoucherAmountPayload: UpdateVoucherAmountPayload;
};
export type UpdateTagUidApiResponse = /** status 200 Successful Response */ any;
export type UpdateTagUidApiArg = {
  accountId: number;
  updateTagUidPayload: UpdateTagUidPayload;
};
export type UpdateAccountCommentApiResponse = /** status 200 Successful Response */ Account;
export type UpdateAccountCommentApiArg = {
  accountId: number;
  updateAccountCommentPayload: UpdateAccountCommentPayload;
};
export type GetUserTagDetailApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type GetUserTagDetailApiArg = {
  userTagUidHex: string;
};
export type UpdateUserTagCommentApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagCommentApiArg = {
  userTagUidHex: string;
  updateCommentPayload: UpdateCommentPayload;
};
export type ListOrdersByTillApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersByTillApiArg = {
  tillId: number;
};
export type ListOrdersApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersApiArg = {
  customerAccountId?: number | null;
};
export type GetOrderApiResponse = /** status 200 Successful Response */ Order;
export type GetOrderApiArg = {
  orderId: number;
};
export type CancelOrderApiResponse = /** status 200 Successful Response */ any;
export type CancelOrderApiArg = {
  orderId: number;
};
export type EditOrderApiResponse = /** status 200 Successful Response */ CompletedSaleProducts;
export type EditOrderApiArg = {
  orderId: number;
  editSaleProducts: EditSaleProducts;
};
export type ListCashiersApiResponse = /** status 200 Successful Response */ NormalizedListCashierInt;
export type ListCashiersApiArg = void;
export type GetCashierApiResponse = /** status 200 Successful Response */ Cashier;
export type GetCashierApiArg = {
  cashierId: number;
};
export type GetCashierShiftsApiResponse = /** status 200 Successful Response */ NormalizedListCashierShiftInt;
export type GetCashierShiftsApiArg = {
  cashierId: number;
};
export type GetCashierShiftStatsApiResponse = /** status 200 Successful Response */ CashierShiftStats;
export type GetCashierShiftStatsApiArg = {
  cashierId: number;
  shiftId?: number | null;
};
export type CloseOutCashierApiResponse = /** status 200 Successful Response */ CloseOutResult;
export type CloseOutCashierApiArg = {
  cashierId: number;
  closeOut: CloseOut;
};
export type GetProductStatsApiResponse = /** status 200 Successful Response */ ProductStats2;
export type GetProductStatsApiArg = {
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type ListTicketsApiResponse = /** status 200 Successful Response */ NormalizedListTicketInt;
export type ListTicketsApiArg = void;
export type CreateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type CreateTicketApiArg = {
  newTicket: NewTicket;
};
export type GetTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type GetTicketApiArg = {
  ticketId: number;
};
export type UpdateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type UpdateTicketApiArg = {
  ticketId: number;
  newTicket: NewTicket;
};
export type DeleteTicketApiResponse = /** status 200 Successful Response */ any;
export type DeleteTicketApiArg = {
  ticketId: number;
};
export type ProductRestriction = "under_16" | "under_18";
export type Product = {
  name: string;
  price: number | null;
  fixed_price: boolean;
  price_in_vouchers?: number | null;
  price_per_voucher?: number | null;
  tax_name: string;
  restrictions: ProductRestriction[];
  is_locked: boolean;
  is_returnable: boolean;
  target_account_id?: number | null;
  id: number;
  tax_rate: number;
};
export type NormalizedListProductInt = {
  ids: number[];
  entities: {
    [key: string]: Product;
  };
};
export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};
export type HttpValidationError = {
  detail?: ValidationError[];
};
export type NewProduct = {
  name: string;
  price: number | null;
  fixed_price?: boolean;
  price_in_vouchers?: number | null;
  price_per_voucher?: number | null;
  tax_name: string;
  restrictions?: ProductRestriction[];
  is_locked?: boolean;
  is_returnable?: boolean;
  target_account_id?: number | null;
};
export type User = {
  login: string;
  display_name: string;
  role_names: string[];
  description?: string | null;
  user_tag_uid?: number | null;
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
  id: number;
  user_tag_uid_hex?: string;
};
export type NormalizedListUserInt = {
  ids: number[];
  entities: {
    [key: string]: User;
  };
};
export type CreateUserPayload = {
  login: string;
  display_name: string;
  role_names: string[];
  description?: string | null;
  user_tag_uid_hex?: string | null;
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
  password?: string | null;
};
export type UpdateUserPayload = {
  login: string;
  display_name: string;
  role_names: string[];
  description?: string | null;
  user_tag_uid_hex?: string | null;
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
};
export type Privilege =
  | "account_management"
  | "cashier_management"
  | "config_management"
  | "product_management"
  | "tax_rate_management"
  | "user_management"
  | "till_management"
  | "order_management"
  | "festival_overview"
  | "terminal_login"
  | "supervised_terminal_login"
  | "can_book_orders"
  | "grant_free_tickets"
  | "grant_vouchers";
export type UserRole = {
  name: string;
  is_privileged?: boolean;
  privileges: Privilege[];
  id: number;
};
export type NormalizedListUserRoleInt = {
  ids: number[];
  entities: {
    [key: string]: UserRole;
  };
};
export type NewUserRole = {
  name: string;
  is_privileged?: boolean;
  privileges: Privilege[];
};
export type UpdateUserRolePrivilegesPayload = {
  is_privileged: boolean;
  privileges: Privilege[];
};
export type TaxRate = {
  rate: number;
  description: string;
  name: string;
};
export type NormalizedListTaxRateStr = {
  ids: string[];
  entities: {
    [key: string]: TaxRate;
  };
};
export type TaxRateWithoutName = {
  rate: number;
  description: string;
};
export type CurrentUser = {
  id: number;
  login: string;
  display_name: string;
  active_role_id?: number | null;
  active_role_name?: string | null;
  privileges: Privilege[];
  description?: string | null;
  user_tag_uid?: number | null;
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
  cash_register_id?: number | null;
  user_tag_uid_hex?: string;
};
export type LoginResponse = {
  user: CurrentUser;
  access_token: string;
  grant_type?: string;
};
export type BodyLoginAuthLoginPost = {
  grant_type?: string | null;
  username: string;
  password: string;
  scope?: string;
  client_id?: string | null;
  client_secret?: string | null;
};
export type ChangePasswordPayload = {
  old_password: string;
  new_password: string;
};
export type Till = {
  name: string;
  description?: string | null;
  active_shift?: string | null;
  active_profile_id: number;
  id: number;
  z_nr: number;
  session_uuid?: string | null;
  registration_uuid?: string | null;
  active_user_id?: number | null;
  active_user_role_id?: number | null;
  current_cash_register_name?: string | null;
  current_cash_register_balance?: number | null;
  tse_id?: number | null;
  tse_serial?: string | null;
};
export type NormalizedListTillInt = {
  ids: number[];
  entities: {
    [key: string]: Till;
  };
};
export type NewTill = {
  name: string;
  description?: string | null;
  active_shift?: string | null;
  active_profile_id: number;
};
export type TillLayout = {
  name: string;
  description: string;
  button_ids?: number[] | null;
  ticket_ids?: number[] | null;
  id: number;
};
export type NormalizedListTillLayoutInt = {
  ids: number[];
  entities: {
    [key: string]: TillLayout;
  };
};
export type NewTillLayout = {
  name: string;
  description: string;
  button_ids?: number[] | null;
  ticket_ids?: number[] | null;
};
export type TillProfile = {
  name: string;
  description?: string | null;
  layout_id: number;
  allow_top_up: boolean;
  allow_cash_out: boolean;
  allow_ticket_sale: boolean;
  allowed_role_names: string[];
  id: number;
};
export type NormalizedListTillProfileInt = {
  ids: number[];
  entities: {
    [key: string]: TillProfile;
  };
};
export type NewTillProfile = {
  name: string;
  description?: string | null;
  layout_id: number;
  allow_top_up: boolean;
  allow_cash_out: boolean;
  allow_ticket_sale: boolean;
  allowed_role_names: string[];
};
export type TillButton = {
  name: string;
  product_ids: number[];
  id: number;
  price: number;
};
export type NormalizedListTillButtonInt = {
  ids: number[];
  entities: {
    [key: string]: TillButton;
  };
};
export type NewTillButton = {
  name: string;
  product_ids: number[];
};
export type CashRegisterStocking = {
  name: string;
  euro200?: number;
  euro100?: number;
  euro50?: number;
  euro20?: number;
  euro10?: number;
  euro5?: number;
  euro2?: number;
  euro1?: number;
  cent50?: number;
  cent20?: number;
  cent10?: number;
  cent5?: number;
  cent2?: number;
  cent1?: number;
  variable_in_euro?: number;
  id: number;
  total: number;
};
export type NormalizedListCashRegisterStockingInt = {
  ids: number[];
  entities: {
    [key: string]: CashRegisterStocking;
  };
};
export type NewCashRegisterStocking = {
  name: string;
  euro200?: number;
  euro100?: number;
  euro50?: number;
  euro20?: number;
  euro10?: number;
  euro5?: number;
  euro2?: number;
  euro1?: number;
  cent50?: number;
  cent20?: number;
  cent10?: number;
  cent5?: number;
  cent2?: number;
  cent1?: number;
  variable_in_euro?: number;
};
export type CashRegister = {
  name: string;
  id: number;
  current_cashier_id: number | null;
  current_cashier_tag_uid: number | null;
  current_till_id: number | null;
  current_balance: number;
};
export type NormalizedListCashRegisterInt = {
  ids: number[];
  entities: {
    [key: string]: CashRegister;
  };
};
export type NewCashRegister = {
  name: string;
};
export type TransferRegisterPayload = {
  source_cashier_id: number;
  target_cashier_id: number;
};
export type Config = {
  test_mode: boolean;
  test_mode_message: string;
  sumup_topup_enabled: boolean;
  currency_symbol: string;
  currency_identifier: string;
  contact_email: string;
  terminal_api_endpoint: string;
};
export type ConfigEntry = {
  key: string;
  value: string | null;
};
export type NormalizedListConfigEntryStr = {
  ids: string[];
  entities: {
    [key: string]: ConfigEntry;
  };
};
export type AccountType = "virtual" | "internal" | "private";
export type UserTagHistoryEntry = {
  user_tag_uid: number;
  account_id: number;
  comment?: string | null;
  mapping_was_valid_until: string;
  user_tag_uid_hex?: string;
};
export type Account = {
  id: number;
  type: AccountType;
  name: string | null;
  comment: string | null;
  balance: number;
  vouchers: number;
  user_tag_uid: number | null;
  user_tag_comment?: string | null;
  restriction: ProductRestriction | null;
  tag_history: UserTagHistoryEntry[];
  user_tag_uid_hex?: string;
};
export type NormalizedListAccountInt = {
  ids: number[];
  entities: {
    [key: string]: Account;
  };
};
export type FindAccountPayload = {
  search_term: string;
};
export type UpdateBalancePayload = {
  new_balance: number;
};
export type UpdateVoucherAmountPayload = {
  new_voucher_amount: number;
};
export type UpdateTagUidPayload = {
  new_tag_uid_hex: string;
  comment?: string | null;
};
export type UpdateAccountCommentPayload = {
  comment: string;
};
export type UserTagAccountAssociation = {
  account_id: number;
  mapping_was_valid_until: string;
};
export type UserTagDetail = {
  user_tag_uid: number;
  comment?: string | null;
  account_id?: number | null;
  account_history: UserTagAccountAssociation[];
  user_tag_uid_hex?: string;
};
export type UpdateCommentPayload = {
  comment: string;
};
export type PaymentMethod = "cash" | "sumup" | "tag" | "sumup_online";
export type OrderType =
  | "sale"
  | "cancel_sale"
  | "top_up"
  | "pay_out"
  | "ticket"
  | "money_transfer"
  | "money_transfer_imbalance";
export type LineItem = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_name: string;
  tax_rate: number;
  item_id: number;
  total_tax: number;
};
export type Order = {
  id: number;
  uuid: string;
  total_price: number;
  total_tax: number;
  total_no_tax: number;
  cancels_order: number | null;
  booked_at: string;
  payment_method: PaymentMethod;
  order_type: OrderType;
  cashier_id: number | null;
  till_id: number | null;
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  line_items: LineItem[];
  customer_tag_uid_hex?: string;
};
export type NormalizedListOrderInt = {
  ids: number[];
  entities: {
    [key: string]: Order;
  };
};
export type PendingLineItem = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_name: string;
  tax_rate: number;
  total_price?: number;
};
export type BookedProduct = {
  product_id: number;
  quantity?: number | null;
  price?: number | null;
};
export type CompletedSaleProducts = {
  uuid: string;
  old_balance: number;
  new_balance: number;
  old_voucher_balance: number;
  new_voucher_balance: number;
  customer_account_id: number;
  line_items: PendingLineItem[];
  products: BookedProduct[];
  id: number;
  booked_at: string;
  cashier_id: number;
  till_id: number;
};
export type EditSaleProducts = {
  uuid: string;
  used_vouchers?: number | null;
  products: BookedProduct[];
};
export type Cashier = {
  id: number;
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_uid?: number | null;
  transport_account_id?: number | null;
  cashier_account_id: number;
  cash_register_id?: number | null;
  cash_drawer_balance: number;
  till_ids: number[];
  user_tag_uid_hex?: string;
};
export type NormalizedListCashierInt = {
  ids: number[];
  entities: {
    [key: string]: Cashier;
  };
};
export type CashierShift = {
  id: number;
  comment: string;
  closing_out_user_id: number;
  actual_cash_drawer_balance: number;
  expected_cash_drawer_balance: number;
  cash_drawer_imbalance: number;
  started_at: string;
  ended_at: string;
};
export type NormalizedListCashierShiftInt = {
  ids: number[];
  entities: {
    [key: string]: CashierShift;
  };
};
export type ProductStats = {
  product: Product;
  quantity: number;
};
export type CashierShiftStats = {
  booked_products: ProductStats[];
};
export type CloseOutResult = {
  cashier_id: number;
  imbalance: number;
};
export type CloseOut = {
  comment: string;
  actual_cash_drawer_balance: number;
  closing_out_user_id: number;
};
export type ProductSoldStats = {
  name: string;
  price: number | null;
  fixed_price: boolean;
  price_in_vouchers?: number | null;
  price_per_voucher?: number | null;
  tax_name: string;
  restrictions: ProductRestriction[];
  is_locked: boolean;
  is_returnable: boolean;
  target_account_id?: number | null;
  id: number;
  tax_rate: number;
  quantity_sold: number;
};
export type VoucherStats = {
  vouchers_issued?: number;
  vouchers_spent?: number;
};
export type ProductStats2 = {
  product_quantities: ProductSoldStats[];
  product_quantities_by_till: {
    [key: string]: ProductSoldStats[];
  };
  voucher_stats: VoucherStats;
};
export type Ticket = {
  name: string;
  description?: string | null;
  product_id: number;
  initial_top_up_amount: number;
  restriction?: ProductRestriction | null;
  id: number;
  product_name: string;
  price: number;
  tax_name: string;
  tax_rate: number;
  total_price: number;
};
export type NormalizedListTicketInt = {
  ids: number[];
  entities: {
    [key: string]: Ticket;
  };
};
export type NewTicket = {
  name: string;
  description?: string | null;
  product_id: number;
  initial_top_up_amount: number;
  restriction?: ProductRestriction | null;
};
export const {
  useListProductsQuery,
  useCreateProductMutation,
  useGetProductQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useListUsersQuery,
  useCreateUserMutation,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useListUserRolesQuery,
  useCreateUserRoleMutation,
  useUpdateUserRoleMutation,
  useDeleteUserRoleMutation,
  useListTaxRatesQuery,
  useCreateTaxRateMutation,
  useGetTaxRateQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,
  useLoginMutation,
  useChangePasswordMutation,
  useLogoutMutation,
  useListTillsQuery,
  useCreateTillMutation,
  useGetTillQuery,
  useUpdateTillMutation,
  useDeleteTillMutation,
  useLogoutTillMutation,
  useForceLogoutUserMutation,
  useListTillLayoutsQuery,
  useCreateTillLayoutMutation,
  useGetTillLayoutQuery,
  useUpdateTillLayoutMutation,
  useDeleteTillLayoutMutation,
  useListTillProfilesQuery,
  useCreateTillProfileMutation,
  useGetTillProfileQuery,
  useUpdateTillProfileMutation,
  useDeleteTillProfileMutation,
  useListTillButtonsQuery,
  useCreateTillButtonMutation,
  useGetTillButtonQuery,
  useUpdateTillButtonMutation,
  useDeleteTillButtonMutation,
  useListRegisterStockingsQuery,
  useCreateRegisterStockingMutation,
  useUpdateRegisterStockingMutation,
  useDeleteRegisterStockingMutation,
  useListCashRegistersAdminQuery,
  useCreateRegisterMutation,
  useTransferRegisterMutation,
  useUpdateRegisterMutation,
  useDeleteRegisterMutation,
  useGetPublicConfigQuery,
  useListConfigEntriesQuery,
  useSetConfigEntryMutation,
  useListSystemAccountsQuery,
  useFindAccountsMutation,
  useGetAccountQuery,
  useDisableAccountMutation,
  useUpdateBalanceMutation,
  useUpdateVoucherAmountMutation,
  useUpdateTagUidMutation,
  useUpdateAccountCommentMutation,
  useGetUserTagDetailQuery,
  useUpdateUserTagCommentMutation,
  useListOrdersByTillQuery,
  useListOrdersQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
  useEditOrderMutation,
  useListCashiersQuery,
  useGetCashierQuery,
  useGetCashierShiftsQuery,
  useGetCashierShiftStatsQuery,
  useCloseOutCashierMutation,
  useGetProductStatsQuery,
  useListTicketsQuery,
  useCreateTicketMutation,
  useGetTicketQuery,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
} = injectedRtkApi;
