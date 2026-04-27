import { emptySplitApi as api } from "./emptyApi";
export const addTagTypes = [
  "products",
  "users",
  "user-roles",
  "user-to-roles",
  "tax-rates",
  "auth",
  "tills",
  "terminals",
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
  "user_tags",
  "tses",
  "payouts",
  "tree",
  "sumup",
  "transactions",
  "mdm",
  "llm",
  "entry",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      listProducts: build.query<ListProductsApiResponse, ListProductsApiArg>({
        query: (queryArg) => ({
          url: `/products`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["products"],
      }),
      createProduct: build.mutation<CreateProductApiResponse, CreateProductApiArg>({
        query: (queryArg) => ({
          url: `/products`,
          method: "POST",
          body: queryArg.newProduct,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["products"],
      }),
      getProduct: build.query<GetProductApiResponse, GetProductApiArg>({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["products"],
      }),
      updateProduct: build.mutation<UpdateProductApiResponse, UpdateProductApiArg>({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          method: "POST",
          body: queryArg.newProduct,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["products"],
      }),
      deleteProduct: build.mutation<DeleteProductApiResponse, DeleteProductApiArg>({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["products"],
      }),
      listUsers: build.query<ListUsersApiResponse, ListUsersApiArg>({
        query: (queryArg) => ({
          url: `/users`,
          params: {
            node_id: queryArg.nodeId,
            filter_privilege: queryArg.filterPrivilege,
          },
        }),
        providesTags: ["users"],
      }),
      createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
        query: (queryArg) => ({
          url: `/users`,
          method: "POST",
          body: queryArg.createUserPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["users"],
      }),
      acceptInvitation: build.mutation<AcceptInvitationApiResponse, AcceptInvitationApiArg>({
        query: (queryArg) => ({
          url: `/users/accept-invitation`,
          method: "POST",
          body: queryArg.acceptInvitationPayload,
        }),
        invalidatesTags: ["users"],
      }),
      getUser: build.query<GetUserApiResponse, GetUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["users"],
      }),
      updateUser: build.mutation<UpdateUserApiResponse, UpdateUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}`,
          method: "POST",
          body: queryArg.updateUserPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["users"],
      }),
      deleteUser: build.mutation<DeleteUserApiResponse, DeleteUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["users"],
      }),
      changeUserPassword: build.mutation<ChangeUserPasswordApiResponse, ChangeUserPasswordApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}/change-password`,
          method: "POST",
          body: queryArg.changeUserPasswordPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["users"],
      }),
      inviteUser: build.mutation<InviteUserApiResponse, InviteUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}/invite`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["users"],
      }),
      listUserRoles: build.query<ListUserRolesApiResponse, ListUserRolesApiArg>({
        query: (queryArg) => ({
          url: `/user-roles`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user-roles"],
      }),
      createUserRole: build.mutation<CreateUserRoleApiResponse, CreateUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles`,
          method: "POST",
          body: queryArg.newUserRole,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user-roles"],
      }),
      updateUserRole: build.mutation<UpdateUserRoleApiResponse, UpdateUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles/${queryArg.userRoleId}`,
          method: "POST",
          body: queryArg.updateUserRolePrivilegesPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user-roles"],
      }),
      deleteUserRole: build.mutation<DeleteUserRoleApiResponse, DeleteUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles/${queryArg.userRoleId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user-roles"],
      }),
      listUserToRole: build.query<ListUserToRoleApiResponse, ListUserToRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-to-roles`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user-to-roles"],
      }),
      updateUserToRoles: build.mutation<UpdateUserToRolesApiResponse, UpdateUserToRolesApiArg>({
        query: (queryArg) => ({
          url: `/user-to-roles`,
          method: "POST",
          body: queryArg.newUserToRoles,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user-to-roles"],
      }),
      listTaxRates: build.query<ListTaxRatesApiResponse, ListTaxRatesApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tax-rates"],
      }),
      createTaxRate: build.mutation<CreateTaxRateApiResponse, CreateTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates`,
          method: "POST",
          body: queryArg.newTaxRate,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tax-rates"],
      }),
      getTaxRate: build.query<GetTaxRateApiResponse, GetTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tax-rates"],
      }),
      updateTaxRate: build.mutation<UpdateTaxRateApiResponse, UpdateTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateId}`,
          method: "POST",
          body: queryArg.newTaxRate,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tax-rates"],
      }),
      deleteTaxRate: build.mutation<DeleteTaxRateApiResponse, DeleteTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tax-rates"],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({ url: `/auth/login`, method: "POST", body: queryArg.loginPayload }),
        invalidatesTags: ["auth"],
      }),
      changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
        query: (queryArg) => ({ url: `/auth/change-password`, method: "POST", body: queryArg.changePasswordPayload }),
        invalidatesTags: ["auth"],
      }),
      getProfile: build.query<GetProfileApiResponse, GetProfileApiArg>({
        query: () => ({ url: `/auth/profile` }),
        providesTags: ["auth"],
      }),
      updateProfile: build.mutation<UpdateProfileApiResponse, UpdateProfileApiArg>({
        query: (queryArg) => ({ url: `/auth/profile`, method: "POST", body: queryArg.updateCurrentUserProfilePayload }),
        invalidatesTags: ["auth"],
      }),
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/auth/logout`, method: "POST" }),
        invalidatesTags: ["auth"],
      }),
      listTills: build.query<ListTillsApiResponse, ListTillsApiArg>({
        query: (queryArg) => ({
          url: `/tills`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tills"],
      }),
      createTill: build.mutation<CreateTillApiResponse, CreateTillApiArg>({
        query: (queryArg) => ({
          url: `/tills`,
          method: "POST",
          body: queryArg.newTill,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tills"],
      }),
      getTill: build.query<GetTillApiResponse, GetTillApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tills"],
      }),
      updateTill: build.mutation<UpdateTillApiResponse, UpdateTillApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}`,
          method: "POST",
          body: queryArg.newTill,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tills"],
      }),
      deleteTill: build.mutation<DeleteTillApiResponse, DeleteTillApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tills"],
      }),
      removeFromTerminal: build.mutation<RemoveFromTerminalApiResponse, RemoveFromTerminalApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}/remove-from-terminal`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tills", "tills", "terminals"],
      }),
      switchTerminal: build.mutation<SwitchTerminalApiResponse, SwitchTerminalApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}/switch-terminal`,
          method: "POST",
          body: queryArg.switchTerminalPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tills", "tills", "terminals"],
      }),
      listTillLayouts: build.query<ListTillLayoutsApiResponse, ListTillLayoutsApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-layouts"],
      }),
      createTillLayout: build.mutation<CreateTillLayoutApiResponse, CreateTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts`,
          method: "POST",
          body: queryArg.newTillLayout,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      getTillLayout: build.query<GetTillLayoutApiResponse, GetTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-layouts"],
      }),
      updateTillLayout: build.mutation<UpdateTillLayoutApiResponse, UpdateTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          method: "POST",
          body: queryArg.newTillLayout,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      deleteTillLayout: build.mutation<DeleteTillLayoutApiResponse, DeleteTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      listTillProfiles: build.query<ListTillProfilesApiResponse, ListTillProfilesApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-profiles"],
      }),
      createTillProfile: build.mutation<CreateTillProfileApiResponse, CreateTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles`,
          method: "POST",
          body: queryArg.newTillProfile,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      getTillProfile: build.query<GetTillProfileApiResponse, GetTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-profiles"],
      }),
      updateTillProfile: build.mutation<UpdateTillProfileApiResponse, UpdateTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          method: "POST",
          body: queryArg.newTillProfile,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      deleteTillProfile: build.mutation<DeleteTillProfileApiResponse, DeleteTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      listTillButtons: build.query<ListTillButtonsApiResponse, ListTillButtonsApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-buttons"],
      }),
      createTillButton: build.mutation<CreateTillButtonApiResponse, CreateTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons`,
          method: "POST",
          body: queryArg.newTillButton,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      getTillButton: build.query<GetTillButtonApiResponse, GetTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-buttons"],
      }),
      updateTillButton: build.mutation<UpdateTillButtonApiResponse, UpdateTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          method: "POST",
          body: queryArg.newTillButton,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      deleteTillButton: build.mutation<DeleteTillButtonApiResponse, DeleteTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      listRegisterStockings: build.query<ListRegisterStockingsApiResponse, ListRegisterStockingsApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-register-stockings"],
      }),
      createRegisterStocking: build.mutation<CreateRegisterStockingApiResponse, CreateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      updateRegisterStocking: build.mutation<UpdateRegisterStockingApiResponse, UpdateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings/${queryArg.stockingId}`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      deleteRegisterStocking: build.mutation<DeleteRegisterStockingApiResponse, DeleteRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings/${queryArg.stockingId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      listCashRegistersAdmin: build.query<ListCashRegistersAdminApiResponse, ListCashRegistersAdminApiArg>({
        query: (queryArg) => ({
          url: `/till-registers`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-registers"],
      }),
      createRegister: build.mutation<CreateRegisterApiResponse, CreateRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers`,
          method: "POST",
          body: queryArg.newCashRegister,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-registers"],
      }),
      getCashRegisterAdmin: build.query<GetCashRegisterAdminApiResponse, GetCashRegisterAdminApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-registers"],
      }),
      updateRegister: build.mutation<UpdateRegisterApiResponse, UpdateRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          method: "POST",
          body: queryArg.newCashRegister,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-registers"],
      }),
      deleteRegister: build.mutation<DeleteRegisterApiResponse, DeleteRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-registers"],
      }),
      getCashierShiftsForRegister: build.query<
        GetCashierShiftsForRegisterApiResponse,
        GetCashierShiftsForRegisterApiArg
      >({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}/cashier-shifts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-registers"],
      }),
      listTransactions: build.query<ListTransactionsApiResponse, ListTransactionsApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}/transactions`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["till-registers"],
      }),
      transferRegister: build.mutation<TransferRegisterApiResponse, TransferRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/transfer-register`,
          method: "POST",
          body: queryArg.transferRegisterPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-registers"],
      }),
      assignRegister: build.mutation<AssignRegisterApiResponse, AssignRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/assign-register`,
          method: "POST",
          body: queryArg.assignRegisterPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["till-registers"],
      }),
      modifyRegisterBalance: build.mutation<ModifyRegisterBalanceApiResponse, ModifyRegisterBalanceApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/modify-balance`,
          method: "POST",
          body: queryArg.modifyRegisterBalancePayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
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
      getGlobalEmailConfig: build.query<GetGlobalEmailConfigApiResponse, GetGlobalEmailConfigApiArg>({
        query: () => ({ url: `/config/email` }),
        providesTags: ["config"],
      }),
      updateGlobalEmailConfig: build.mutation<UpdateGlobalEmailConfigApiResponse, UpdateGlobalEmailConfigApiArg>({
        query: (queryArg) => ({ url: `/config/email`, method: "POST", body: queryArg.globalEmailConfig }),
        invalidatesTags: ["config"],
      }),
      getGlobalSumupConfig: build.query<GetGlobalSumupConfigApiResponse, GetGlobalSumupConfigApiArg>({
        query: () => ({ url: `/config/sumup` }),
        providesTags: ["config"],
      }),
      updateGlobalSumupConfig: build.mutation<UpdateGlobalSumupConfigApiResponse, UpdateGlobalSumupConfigApiArg>({
        query: (queryArg) => ({ url: `/config/sumup`, method: "POST", body: queryArg.globalSumUpConfig }),
        invalidatesTags: ["config"],
      }),
      sendGlobalEmailTest: build.mutation<SendGlobalEmailTestApiResponse, SendGlobalEmailTestApiArg>({
        query: () => ({ url: `/config/email/test`, method: "POST" }),
        invalidatesTags: ["config"],
      }),
      listSystemAccounts: build.query<ListSystemAccountsApiResponse, ListSystemAccountsApiArg>({
        query: (queryArg) => ({
          url: `/system-accounts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["accounts"],
      }),
      findAccounts: build.mutation<FindAccountsApiResponse, FindAccountsApiArg>({
        query: (queryArg) => ({
          url: `/accounts/find-accounts`,
          method: "POST",
          body: queryArg.findAccountPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      getAccount: build.query<GetAccountApiResponse, GetAccountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["accounts"],
      }),
      disableAccount: build.mutation<DisableAccountApiResponse, DisableAccountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/disable`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateBalance: build.mutation<UpdateBalanceApiResponse, UpdateBalanceApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-balance`,
          method: "POST",
          body: queryArg.updateBalancePayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateVoucherAmount: build.mutation<UpdateVoucherAmountApiResponse, UpdateVoucherAmountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-voucher-amount`,
          method: "POST",
          body: queryArg.updateVoucherAmountPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      transferBalance: build.mutation<TransferBalanceApiResponse, TransferBalanceApiArg>({
        query: (queryArg) => ({
          url: `/accounts/transfer-balance`,
          method: "POST",
          body: queryArg.transferBalancePayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateAccountComment: build.mutation<UpdateAccountCommentApiResponse, UpdateAccountCommentApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-comment`,
          method: "POST",
          body: queryArg.updateAccountCommentPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      listOrdersByTill: build.query<ListOrdersByTillApiResponse, ListOrdersByTillApiArg>({
        query: (queryArg) => ({
          url: `/orders/by-till/${queryArg.tillId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["orders"],
      }),
      listOrdersFiltered: build.query<ListOrdersFilteredApiResponse, ListOrdersFilteredApiArg>({
        query: (queryArg) => ({
          url: `/orders/filtered`,
          params: {
            node_id: queryArg.nodeId,
            from_timestamp: queryArg.fromTimestamp,
            to_timestamp: queryArg.toTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            limit: queryArg.limit,
            offset: queryArg.offset,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["orders"],
      }),
      listOrders: build.query<ListOrdersApiResponse, ListOrdersApiArg>({
        query: (queryArg) => ({
          url: `/orders`,
          params: {
            node_id: queryArg.nodeId,
            customer_account_id: queryArg.customerAccountId,
          },
        }),
        providesTags: ["orders"],
      }),
      getOrder: build.query<GetOrderApiResponse, GetOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["orders"],
      }),
      cancelOrder: build.mutation<CancelOrderApiResponse, CancelOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["orders"],
      }),
      getOrderBon: build.query<GetOrderBonApiResponse, GetOrderBonApiArg>({
        query: (queryArg) => ({ url: `/orders/${queryArg.orderId}/bon` }),
        providesTags: ["orders"],
      }),
      editOrder: build.mutation<EditOrderApiResponse, EditOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}/edit`,
          method: "POST",
          body: queryArg.editSaleProducts,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["orders"],
      }),
      listCashiers: build.query<ListCashiersApiResponse, ListCashiersApiArg>({
        query: (queryArg) => ({
          url: `/cashiers`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["cashiers"],
      }),
      getCashier: build.query<GetCashierApiResponse, GetCashierApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["cashiers"],
      }),
      getCashierShifts: build.query<GetCashierShiftsApiResponse, GetCashierShiftsApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/shifts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["cashiers"],
      }),
      getCashierShiftStats: build.query<GetCashierShiftStatsApiResponse, GetCashierShiftStatsApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/shift-stats`,
          params: {
            node_id: queryArg.nodeId,
            shift_id: queryArg.shiftId,
          },
        }),
        providesTags: ["cashiers"],
      }),
      closeOutCashier: build.mutation<CloseOutCashierApiResponse, CloseOutCashierApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/close-out`,
          method: "POST",
          body: queryArg.closeOut,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["cashiers"],
      }),
      getProductStats: build.query<GetProductStatsApiResponse, GetProductStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/products`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getVoucherStats: build.query<GetVoucherStatsApiResponse, GetVoucherStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/vouchers`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getEntryStats: build.query<GetEntryStatsApiResponse, GetEntryStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/entries`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getTopUpStats: build.query<GetTopUpStatsApiResponse, GetTopUpStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/top-ups`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getPayOutStats: build.query<GetPayOutStatsApiResponse, GetPayOutStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/pay-outs`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getDashboardOverview: build.query<GetDashboardOverviewApiResponse, GetDashboardOverviewApiArg>({
        query: (queryArg) => ({
          url: `/stats/dashboard-overview`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getRevenueByCounter: build.query<GetRevenueByCounterApiResponse, GetRevenueByCounterApiArg>({
        query: (queryArg) => ({
          url: `/stats/revenue-by-counter`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getPaymentMethodStats: build.query<GetPaymentMethodStatsApiResponse, GetPaymentMethodStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/payment-methods`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
            selected_dates: queryArg.selectedDates,
          },
        }),
        providesTags: ["stats"],
      }),
      getAvailableDates: build.query<GetAvailableDatesApiResponse, GetAvailableDatesApiArg>({
        query: (queryArg) => ({
          url: `/stats/available-dates`,
          params: {
            node_id: queryArg.nodeId,
            subnode_id: queryArg.subnodeId,
          },
        }),
        providesTags: ["stats"],
      }),
      getRevenuePrediction: build.query<GetRevenuePredictionApiResponse, GetRevenuePredictionApiArg>({
        query: (queryArg) => ({
          url: `/stats/revenue-prediction`,
          params: {
            node_id: queryArg.nodeId,
            till_id: queryArg.tillId,
            subnode_id: queryArg.subnodeId,
          },
        }),
        providesTags: ["stats"],
      }),
      listTickets: build.query<ListTicketsApiResponse, ListTicketsApiArg>({
        query: (queryArg) => ({
          url: `/tickets`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tickets"],
      }),
      createTicket: build.mutation<CreateTicketApiResponse, CreateTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets`,
          method: "POST",
          body: queryArg.newTicket,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tickets"],
      }),
      getTicket: build.query<GetTicketApiResponse, GetTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets/${queryArg.ticketId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tickets"],
      }),
      updateTicket: build.mutation<UpdateTicketApiResponse, UpdateTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets/${queryArg.ticketId}`,
          method: "POST",
          body: queryArg.newTicket,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tickets"],
      }),
      deleteTicket: build.mutation<DeleteTicketApiResponse, DeleteTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets/${queryArg.ticketId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tickets"],
      }),
      createUserTagSecret: build.mutation<CreateUserTagSecretApiResponse, CreateUserTagSecretApiArg>({
        query: (queryArg) => ({
          url: `/user-tag-secrets`,
          method: "POST",
          body: queryArg.newUserTagSecret,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      listUserTagSecrets: build.query<ListUserTagSecretsApiResponse, ListUserTagSecretsApiArg>({
        query: (queryArg) => ({
          url: `/user-tag-secrets`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user_tags"],
      }),
      createUserTags: build.mutation<CreateUserTagsApiResponse, CreateUserTagsApiArg>({
        query: (queryArg) => ({
          url: `/user-tags`,
          method: "POST",
          body: queryArg.newUserTags,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      findUserTags: build.mutation<FindUserTagsApiResponse, FindUserTagsApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/find-user-tags`,
          method: "POST",
          body: queryArg.findUserTagPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      countTagsWithoutAccounts: build.query<CountTagsWithoutAccountsApiResponse, CountTagsWithoutAccountsApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/count-without-accounts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user_tags"],
      }),
      createAccountsForUserTags: build.mutation<CreateAccountsForUserTagsApiResponse, CreateAccountsForUserTagsApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/create-accounts`,
          method: "POST",
          body: queryArg.createAccountsPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      getUserTagDetail: build.query<GetUserTagDetailApiResponse, GetUserTagDetailApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user_tags"],
      }),
      updateUserTagComment: build.mutation<UpdateUserTagCommentApiResponse, UpdateUserTagCommentApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}/update-comment`,
          method: "POST",
          body: queryArg.updateCommentPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      updateUserTagVipStatus: build.mutation<UpdateUserTagVipStatusApiResponse, UpdateUserTagVipStatusApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}/update-vip-status`,
          method: "POST",
          body: queryArg.updateVipStatusPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      updateUserTagGroupTag: build.mutation<UpdateUserTagGroupTagApiResponse, UpdateUserTagGroupTagApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}/update-group-tag`,
          method: "POST",
          body: queryArg.updateGroupTagPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      updateUserTagAccountCreationBlocked: build.mutation<
        UpdateUserTagAccountCreationBlockedApiResponse,
        UpdateUserTagAccountCreationBlockedApiArg
      >({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}/update-account-creation-blocked`,
          method: "POST",
          body: queryArg.updateAccountCreationBlockedPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["user_tags"],
      }),
      listTses: build.query<ListTsesApiResponse, ListTsesApiArg>({
        query: (queryArg) => ({
          url: `/tses/`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["tses"],
      }),
      createTse: build.mutation<CreateTseApiResponse, CreateTseApiArg>({
        query: (queryArg) => ({
          url: `/tses/`,
          method: "POST",
          body: queryArg.newTse,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tses"],
      }),
      updateTse: build.mutation<UpdateTseApiResponse, UpdateTseApiArg>({
        query: (queryArg) => ({
          url: `/tses/${queryArg.tseId}`,
          method: "POST",
          body: queryArg.updateTse,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["tses"],
      }),
      listPayoutRuns: build.query<ListPayoutRunsApiResponse, ListPayoutRunsApiArg>({
        query: (queryArg) => ({
          url: `/payouts/`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["payouts"],
      }),
      createPayoutRun: build.mutation<CreatePayoutRunApiResponse, CreatePayoutRunApiArg>({
        query: (queryArg) => ({
          url: `/payouts/`,
          method: "POST",
          body: queryArg.newPayoutRun,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      pendingPayoutDetail: build.query<PendingPayoutDetailApiResponse, PendingPayoutDetailApiArg>({
        query: (queryArg) => ({
          url: `/payouts/pending-payout-detail`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["payouts"],
      }),
      payoutRunPayouts: build.query<PayoutRunPayoutsApiResponse, PayoutRunPayoutsApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/payouts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["payouts"],
      }),
      payoutRunCsvExport: build.mutation<PayoutRunCsvExportApiResponse, PayoutRunCsvExportApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/csv`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      payoutRunSepaXml: build.mutation<PayoutRunSepaXmlApiResponse, PayoutRunSepaXmlApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/sepa_xml`,
          method: "POST",
          body: queryArg.createSepaXmlPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      previousPayoutRunSepaXml: build.mutation<PreviousPayoutRunSepaXmlApiResponse, PreviousPayoutRunSepaXmlApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/previous_sepa_xml`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      setPayoutRunAsDone: build.mutation<SetPayoutRunAsDoneApiResponse, SetPayoutRunAsDoneApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/set-as-done`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      revokePayoutRun: build.mutation<RevokePayoutRunApiResponse, RevokePayoutRunApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/revoke`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["payouts"],
      }),
      getTreeForCurrentUser: build.query<GetTreeForCurrentUserApiResponse, GetTreeForCurrentUserApiArg>({
        query: () => ({ url: `/tree/` }),
        providesTags: ["tree"],
      }),
      createNode: build.mutation<CreateNodeApiResponse, CreateNodeApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/create-node`,
          method: "POST",
          body: queryArg.newNode,
        }),
        invalidatesTags: ["tree"],
      }),
      updateNode: build.mutation<UpdateNodeApiResponse, UpdateNodeApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/settings`,
          method: "POST",
          body: queryArg.newNode,
        }),
        invalidatesTags: ["tree"],
      }),
      archiveNode: build.mutation<ArchiveNodeApiResponse, ArchiveNodeApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/archive-node`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      createEvent: build.mutation<CreateEventApiResponse, CreateEventApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/create-event`,
          method: "POST",
          body: queryArg.newEvent,
        }),
        invalidatesTags: ["tree"],
      }),
      copyEvent: build.mutation<CopyEventApiResponse, CopyEventApiArg>({
        query: (queryArg) => ({
          url: `/tree/events/${queryArg.nodeId}/copy-event`,
          method: "POST",
          body: queryArg.copyEventRequest,
        }),
        invalidatesTags: ["tree"],
      }),
      updateEvent: build.mutation<UpdateEventApiResponse, UpdateEventApiArg>({
        query: (queryArg) => ({
          url: `/tree/events/${queryArg.nodeId}/event-settings`,
          method: "POST",
          body: queryArg.updateEvent,
        }),
        invalidatesTags: ["tree"],
      }),
      getRestrictedEventSettings: build.query<GetRestrictedEventSettingsApiResponse, GetRestrictedEventSettingsApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/settings` }),
        providesTags: ["tree"],
      }),
      clearLegacySumupSettings: build.mutation<ClearLegacySumupSettingsApiResponse, ClearLegacySumupSettingsApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/clear-legacy-sumup-settings`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      deleteNode: build.mutation<DeleteNodeApiResponse, DeleteNodeApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}`, method: "DELETE" }),
        invalidatesTags: ["tree"],
      }),
      generateTestBon: build.mutation<GenerateTestBonApiResponse, GenerateTestBonApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/generate-test-bon`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      generateTestReport: build.mutation<GenerateTestReportApiResponse, GenerateTestReportApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/generate-test-report`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      generateRevenueReport: build.mutation<GenerateRevenueReportApiResponse, GenerateRevenueReportApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/generate-revenue-report`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      getNodeSumupLinkStatus: build.query<GetNodeSumupLinkStatusApiResponse, GetNodeSumupLinkStatusApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/sumup-link` }),
        providesTags: ["tree"],
      }),
      deleteNodeSumupLink: build.mutation<DeleteNodeSumupLinkApiResponse, DeleteNodeSumupLinkApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/sumup-link`, method: "DELETE" }),
        invalidatesTags: ["tree"],
      }),
      configureSumupToken: build.mutation<ConfigureSumupTokenApiResponse, ConfigureSumupTokenApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/configure-sumup-token`,
          method: "POST",
          body: queryArg.sumUpTokenPayload,
        }),
        invalidatesTags: ["tree"],
      }),
      uploadEventBanner: build.mutation<UploadEventBannerApiResponse, UploadEventBannerApiArg>({
        query: (queryArg) => ({
          url: `/tree/events/${queryArg.nodeId}/banner`,
          method: "POST",
          body: queryArg.bodyUploadEventBannerTreeEventsNodeIdBannerPost,
        }),
        invalidatesTags: ["tree"],
      }),
      deleteEventBanner: build.mutation<DeleteEventBannerApiResponse, DeleteEventBannerApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/banner`, method: "DELETE" }),
        invalidatesTags: ["tree"],
      }),
      getEventBanner: build.query<GetEventBannerApiResponse, GetEventBannerApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/banner` }),
        providesTags: ["tree"],
      }),
      listSumupCheckouts: build.query<ListSumupCheckoutsApiResponse, ListSumupCheckoutsApiArg>({
        query: (queryArg) => ({
          url: `/sumup/checkouts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["sumup"],
      }),
      listSumupTransactions: build.query<ListSumupTransactionsApiResponse, ListSumupTransactionsApiArg>({
        query: (queryArg) => ({
          url: `/sumup/transactions`,
          params: {
            node_id: queryArg.nodeId,
            limit: queryArg.limit,
            transaction_code: queryArg.transactionCode,
            newest_time: queryArg.newestTime,
          },
        }),
        providesTags: ["sumup"],
      }),
      getSumupCheckout: build.query<GetSumupCheckoutApiResponse, GetSumupCheckoutApiArg>({
        query: (queryArg) => ({
          url: `/sumup/checkouts/${queryArg.checkoutId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["sumup"],
      }),
      findCustomers: build.mutation<FindCustomersApiResponse, FindCustomersApiArg>({
        query: (queryArg) => ({
          url: `/customers/find-customers`,
          method: "POST",
          body: queryArg.findCustomerPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      findCustomerTagSwapCandidates: build.mutation<
        FindCustomerTagSwapCandidatesApiResponse,
        FindCustomerTagSwapCandidatesApiArg
      >({
        query: (queryArg) => ({
          url: `/customers/tag-swap/find-tags`,
          method: "POST",
          body: queryArg.findTagSwapCandidatesPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      swapCustomerTag: build.mutation<SwapCustomerTagApiResponse, SwapCustomerTagApiArg>({
        query: (queryArg) => ({
          url: `/customers/tag-swap`,
          method: "POST",
          body: queryArg.swapCustomerTagPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      getCustomer: build.query<GetCustomerApiResponse, GetCustomerApiArg>({
        query: (queryArg) => ({
          url: `/customers/${queryArg.customerId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["accounts"],
      }),
      preventCustomerPayout: build.mutation<PreventCustomerPayoutApiResponse, PreventCustomerPayoutApiArg>({
        query: (queryArg) => ({
          url: `/customers/${queryArg.customerId}/prevent-payout`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      allowCustomerPayout: build.mutation<AllowCustomerPayoutApiResponse, AllowCustomerPayoutApiArg>({
        query: (queryArg) => ({
          url: `/customers/${queryArg.customerId}/allow-payout`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["accounts"],
      }),
      listTerminals: build.query<ListTerminalsApiResponse, ListTerminalsApiArg>({
        query: (queryArg) => ({
          url: `/terminal`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["terminals"],
      }),
      createTerminal: build.mutation<CreateTerminalApiResponse, CreateTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal`,
          method: "POST",
          body: queryArg.newTerminal,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      getTerminal: build.query<GetTerminalApiResponse, GetTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["terminals"],
      }),
      updateTerminal: build.mutation<UpdateTerminalApiResponse, UpdateTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}`,
          method: "POST",
          body: queryArg.newTerminal,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      deleteTerminal: build.mutation<DeleteTerminalApiResponse, DeleteTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      logoutTerminal: build.mutation<LogoutTerminalApiResponse, LogoutTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}/logout`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      switchTill: build.mutation<SwitchTillApiResponse, SwitchTillApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}/switch-till`,
          method: "POST",
          body: queryArg.switchTillPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals", "tills", "terminals"],
      }),
      forceLogoutUser: build.mutation<ForceLogoutUserApiResponse, ForceLogoutUserApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}/force-logout-user`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      loginUser: build.mutation<LoginUserApiResponse, LoginUserApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}/login-user`,
          method: "POST",
          body: queryArg.terminalUserLoginPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["terminals"],
      }),
      getTransaction: build.query<GetTransactionApiResponse, GetTransactionApiArg>({
        query: (queryArg) => ({
          url: `/transactions/${queryArg.transactionId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["transactions"],
      }),
      listMappings: build.query<ListMappingsApiResponse, ListMappingsApiArg>({
        query: (queryArg) => ({
          url: `/mdm/mappings`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["mdm"],
      }),
      createOrUpdateMapping: build.mutation<CreateOrUpdateMappingApiResponse, CreateOrUpdateMappingApiArg>({
        query: (queryArg) => ({
          url: `/mdm/mappings`,
          method: "POST",
          body: queryArg.createHeadwindMappingPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["mdm"],
      }),
      listHeadwindDevices: build.query<ListHeadwindDevicesApiResponse, ListHeadwindDevicesApiArg>({
        query: (queryArg) => ({
          url: `/mdm/devices`,
          params: {
            node_id: queryArg.nodeId,
            page: queryArg.page,
            page_size: queryArg.pageSize,
            search: queryArg.search,
          },
        }),
        providesTags: ["mdm"],
      }),
      deleteMapping: build.mutation<DeleteMappingApiResponse, DeleteMappingApiArg>({
        query: (queryArg) => ({
          url: `/mdm/mappings/${queryArg.terminalId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["mdm"],
      }),
      refreshMappingToken: build.mutation<RefreshMappingTokenApiResponse, RefreshMappingTokenApiArg>({
        query: (queryArg) => ({
          url: `/mdm/mappings/${queryArg.terminalId}/refresh-token`,
          method: "POST",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["mdm"],
      }),
      listLlmTools: build.query<ListLlmToolsApiResponse, ListLlmToolsApiArg>({
        query: () => ({ url: `/llm/tools` }),
        providesTags: ["llm"],
      }),
      listNodesLlm: build.query<ListNodesLlmApiResponse, ListNodesLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/nodes`,
          params: {
            parent_node_id: queryArg.parentNodeId,
            name_query: queryArg.nameQuery,
          },
        }),
        providesTags: ["llm"],
      }),
      createNodeLlm: build.mutation<CreateNodeLlmApiResponse, CreateNodeLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/nodes`, method: "POST", body: queryArg.createNodePayload }),
        invalidatesTags: ["llm"],
      }),
      createProductLlm: build.mutation<CreateProductLlmApiResponse, CreateProductLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/products`, method: "POST", body: queryArg.createProductPayload }),
        invalidatesTags: ["llm"],
      }),
      listProductsLlm: build.query<ListProductsLlmApiResponse, ListProductsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/products`,
          params: {
            node_id: queryArg.nodeId,
            include_subtree: queryArg.includeSubtree,
          },
        }),
        providesTags: ["llm"],
      }),
      createCashRegisterLlm: build.mutation<CreateCashRegisterLlmApiResponse, CreateCashRegisterLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/cash-registers`, method: "POST", body: queryArg.createCashRegisterPayload }),
        invalidatesTags: ["llm"],
      }),
      listCashRegistersLlm: build.query<ListCashRegistersLlmApiResponse, ListCashRegistersLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/cash-registers`,
          params: {
            node_id: queryArg.nodeId,
            include_subtree: queryArg.includeSubtree,
          },
        }),
        providesTags: ["llm"],
      }),
      createTillLlm: build.mutation<CreateTillLlmApiResponse, CreateTillLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/tills`, method: "POST", body: queryArg.createTillPayload }),
        invalidatesTags: ["llm"],
      }),
      listTillsLlm: build.query<ListTillsLlmApiResponse, ListTillsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/tills`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      createTillButtonLlm: build.mutation<CreateTillButtonLlmApiResponse, CreateTillButtonLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/till-buttons`, method: "POST", body: queryArg.createTillButtonPayload }),
        invalidatesTags: ["llm"],
      }),
      listTillButtonsLlm: build.query<ListTillButtonsLlmApiResponse, ListTillButtonsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/till-buttons`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      createTillLayoutLlm: build.mutation<CreateTillLayoutLlmApiResponse, CreateTillLayoutLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/till-layouts`, method: "POST", body: queryArg.createTillLayoutPayload }),
        invalidatesTags: ["llm"],
      }),
      listTillLayoutsLlm: build.query<ListTillLayoutsLlmApiResponse, ListTillLayoutsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/till-layouts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      createTillProfileLlm: build.mutation<CreateTillProfileLlmApiResponse, CreateTillProfileLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/till-profiles`, method: "POST", body: queryArg.createTillProfilePayload }),
        invalidatesTags: ["llm"],
      }),
      listTillProfilesLlm: build.query<ListTillProfilesLlmApiResponse, ListTillProfilesLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/till-profiles`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      createTerminalLlm: build.mutation<CreateTerminalLlmApiResponse, CreateTerminalLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/terminals`, method: "POST", body: queryArg.createTerminalPayload }),
        invalidatesTags: ["llm"],
      }),
      listTerminalsLlm: build.query<ListTerminalsLlmApiResponse, ListTerminalsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/terminals`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      createTaxRateLlm: build.mutation<CreateTaxRateLlmApiResponse, CreateTaxRateLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/tax-rates`, method: "POST", body: queryArg.createTaxRatePayload }),
        invalidatesTags: ["llm"],
      }),
      listTaxRatesLlm: build.query<ListTaxRatesLlmApiResponse, ListTaxRatesLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/tax-rates`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["llm"],
      }),
      listEventsLlm: build.query<ListEventsLlmApiResponse, ListEventsLlmApiArg>({
        query: (queryArg) => ({
          url: `/llm/events`,
          params: {
            name_query: queryArg.nameQuery,
          },
        }),
        providesTags: ["llm"],
      }),
      listEntryAreas: build.query<ListEntryAreasApiResponse, ListEntryAreasApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      createEntryArea: build.mutation<CreateEntryAreaApiResponse, CreateEntryAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas`,
          method: "POST",
          body: queryArg.newEntryArea,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      getEntryArea: build.query<GetEntryAreaApiResponse, GetEntryAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      updateEntryArea: build.mutation<UpdateEntryAreaApiResponse, UpdateEntryAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}`,
          method: "POST",
          body: queryArg.newEntryArea,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      deleteEntryArea: build.mutation<DeleteEntryAreaApiResponse, DeleteEntryAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      listEntryAreaGroups: build.query<ListEntryAreaGroupsApiResponse, ListEntryAreaGroupsApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      assignEntryGroupToArea: build.mutation<AssignEntryGroupToAreaApiResponse, AssignEntryGroupToAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups`,
          method: "POST",
          body: queryArg.entryAreaGroupAssignPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      removeEntryGroupFromArea: build.mutation<RemoveEntryGroupFromAreaApiResponse, RemoveEntryGroupFromAreaApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups/${queryArg.groupId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      listEntryAreaGroupWindows: build.query<ListEntryAreaGroupWindowsApiResponse, ListEntryAreaGroupWindowsApiArg>({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups/${queryArg.groupId}/windows`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      createEntryAreaGroupWindow: build.mutation<
        CreateEntryAreaGroupWindowApiResponse,
        CreateEntryAreaGroupWindowApiArg
      >({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups/${queryArg.groupId}/windows`,
          method: "POST",
          body: queryArg.newEntryAreaGroupWindow,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      updateEntryAreaGroupWindow: build.mutation<
        UpdateEntryAreaGroupWindowApiResponse,
        UpdateEntryAreaGroupWindowApiArg
      >({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups/${queryArg.groupId}/windows/${queryArg.windowId}`,
          method: "POST",
          body: queryArg.newEntryAreaGroupWindow,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      deleteEntryAreaGroupWindow: build.mutation<
        DeleteEntryAreaGroupWindowApiResponse,
        DeleteEntryAreaGroupWindowApiArg
      >({
        query: (queryArg) => ({
          url: `/entry/areas/${queryArg.areaId}/groups/${queryArg.groupId}/windows/${queryArg.windowId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      listEntryGroups: build.query<ListEntryGroupsApiResponse, ListEntryGroupsApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      createEntryGroup: build.mutation<CreateEntryGroupApiResponse, CreateEntryGroupApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups`,
          method: "POST",
          body: queryArg.newEntryGroup,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      getEntryGroup: build.query<GetEntryGroupApiResponse, GetEntryGroupApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      updateEntryGroup: build.mutation<UpdateEntryGroupApiResponse, UpdateEntryGroupApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}`,
          method: "POST",
          body: queryArg.newEntryGroup,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      deleteEntryGroup: build.mutation<DeleteEntryGroupApiResponse, DeleteEntryGroupApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      listEntryGroupMembers: build.query<ListEntryGroupMembersApiResponse, ListEntryGroupMembersApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}/members`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["entry"],
      }),
      addEntryGroupMember: build.mutation<AddEntryGroupMemberApiResponse, AddEntryGroupMemberApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}/members`,
          method: "POST",
          body: queryArg.entryGroupMemberAddPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      addEntryGroupMembersByGroupTag: build.mutation<
        AddEntryGroupMembersByGroupTagApiResponse,
        AddEntryGroupMembersByGroupTagApiArg
      >({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}/members/by-group-tag`,
          method: "POST",
          body: queryArg.entryGroupMemberAddByGroupTagPayload,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      removeEntryGroupMember: build.mutation<RemoveEntryGroupMemberApiResponse, RemoveEntryGroupMemberApiArg>({
        query: (queryArg) => ({
          url: `/entry/groups/${queryArg.groupId}/members/${queryArg.userTagId}`,
          method: "DELETE",
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        invalidatesTags: ["entry"],
      }),
      listEntryScanLogs: build.query<ListEntryScanLogsApiResponse, ListEntryScanLogsApiArg>({
        query: (queryArg) => ({
          url: `/entry/logs`,
          params: {
            node_id: queryArg.nodeId,
            area_id: queryArg.areaId,
            group_id: queryArg.groupId,
            terminal_id: queryArg.terminalId,
            direction: queryArg.direction,
            allowed: queryArg.allowed,
            user_tag_uid: queryArg.userTagUid,
            from_time: queryArg.fromTime,
            to_time: queryArg.toTime,
            limit: queryArg.limit,
            offset: queryArg.offset,
          },
        }),
        providesTags: ["entry"],
      }),
      exportEntryScanLogs: build.query<ExportEntryScanLogsApiResponse, ExportEntryScanLogsApiArg>({
        query: (queryArg) => ({
          url: `/entry/logs/export`,
          params: {
            node_id: queryArg.nodeId,
            area_id: queryArg.areaId,
            group_id: queryArg.groupId,
            terminal_id: queryArg.terminalId,
            direction: queryArg.direction,
            allowed: queryArg.allowed,
            user_tag_uid: queryArg.userTagUid,
            from_time: queryArg.fromTime,
            to_time: queryArg.toTime,
            limit: queryArg.limit,
            offset: queryArg.offset,
          },
        }),
        providesTags: ["entry"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type ListProductsApiResponse = /** status 200 Successful Response */ NormalizedListProductInt;
export type ListProductsApiArg = {
  nodeId: number;
};
export type CreateProductApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductApiArg = {
  nodeId: number;
  newProduct: NewProduct;
};
export type GetProductApiResponse = /** status 200 Successful Response */ Product;
export type GetProductApiArg = {
  productId: number;
  nodeId: number;
};
export type UpdateProductApiResponse = /** status 200 Successful Response */ Product;
export type UpdateProductApiArg = {
  productId: number;
  nodeId: number;
  newProduct: NewProduct;
};
export type DeleteProductApiResponse = /** status 200 Successful Response */ any;
export type DeleteProductApiArg = {
  productId: number;
  nodeId: number;
};
export type ListUsersApiResponse = /** status 200 Successful Response */ NormalizedListUserInt;
export type ListUsersApiArg = {
  nodeId: number;
  filterPrivilege?: Privilege | null;
};
export type CreateUserApiResponse = /** status 200 Successful Response */ UserRead;
export type CreateUserApiArg = {
  nodeId: number;
  createUserPayload: CreateUserPayload;
};
export type AcceptInvitationApiResponse = /** status 200 Successful Response */ {
  [key: string]: string;
};
export type AcceptInvitationApiArg = {
  acceptInvitationPayload: AcceptInvitationPayload;
};
export type GetUserApiResponse = /** status 200 Successful Response */ UserRead;
export type GetUserApiArg = {
  userId: number;
  nodeId: number;
};
export type UpdateUserApiResponse = /** status 200 Successful Response */ UserRead;
export type UpdateUserApiArg = {
  userId: number;
  nodeId: number;
  updateUserPayload: UpdateUserPayload;
};
export type DeleteUserApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserApiArg = {
  userId: number;
  nodeId: number;
};
export type ChangeUserPasswordApiResponse = /** status 200 Successful Response */ UserRead;
export type ChangeUserPasswordApiArg = {
  userId: number;
  nodeId: number;
  changeUserPasswordPayload: ChangeUserPasswordPayload;
};
export type InviteUserApiResponse = /** status 200 Successful Response */ UserInvitation;
export type InviteUserApiArg = {
  userId: number;
  nodeId: number;
};
export type ListUserRolesApiResponse = /** status 200 Successful Response */ NormalizedListUserRoleInt;
export type ListUserRolesApiArg = {
  nodeId: number;
};
export type CreateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type CreateUserRoleApiArg = {
  nodeId: number;
  newUserRole: NewUserRole;
};
export type UpdateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type UpdateUserRoleApiArg = {
  userRoleId: number;
  nodeId: number;
  updateUserRolePrivilegesPayload: UpdateUserRolePrivilegesPayload;
};
export type DeleteUserRoleApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserRoleApiArg = {
  userRoleId: number;
  nodeId: number;
};
export type ListUserToRoleApiResponse = /** status 200 Successful Response */ UserToRoles[];
export type ListUserToRoleApiArg = {
  nodeId: number;
};
export type UpdateUserToRolesApiResponse = /** status 200 Successful Response */ UserToRoles;
export type UpdateUserToRolesApiArg = {
  nodeId: number;
  newUserToRoles: NewUserToRoles;
};
export type ListTaxRatesApiResponse = /** status 200 Successful Response */ NormalizedListTaxRateInt;
export type ListTaxRatesApiArg = {
  nodeId: number;
};
export type CreateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type CreateTaxRateApiArg = {
  nodeId: number;
  newTaxRate: NewTaxRate;
};
export type GetTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type GetTaxRateApiArg = {
  taxRateId: number;
  nodeId: number;
};
export type UpdateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type UpdateTaxRateApiArg = {
  taxRateId: number;
  nodeId: number;
  newTaxRate: NewTaxRate;
};
export type DeleteTaxRateApiResponse = /** status 200 Successful Response */ any;
export type DeleteTaxRateApiArg = {
  taxRateId: number;
  nodeId: number;
};
export type LoginApiResponse = /** status 200 Successful Response */ UserLoginResult;
export type LoginApiArg = {
  loginPayload: LoginPayload;
};
export type ChangePasswordApiResponse = /** status 200 Successful Response */ any;
export type ChangePasswordApiArg = {
  changePasswordPayload: ChangePasswordPayload;
};
export type GetProfileApiResponse = /** status 200 Successful Response */ CurrentUser;
export type GetProfileApiArg = void;
export type UpdateProfileApiResponse = /** status 200 Successful Response */ CurrentUser;
export type UpdateProfileApiArg = {
  updateCurrentUserProfilePayload: UpdateCurrentUserProfilePayload;
};
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type ListTillsApiResponse = /** status 200 Successful Response */ NormalizedListTillInt;
export type ListTillsApiArg = {
  nodeId: number;
};
export type CreateTillApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillApiArg = {
  nodeId: number;
  newTill: NewTill;
};
export type GetTillApiResponse = /** status 200 Successful Response */ Till;
export type GetTillApiArg = {
  tillId: number;
  nodeId: number;
};
export type UpdateTillApiResponse = /** status 200 Successful Response */ Till;
export type UpdateTillApiArg = {
  tillId: number;
  nodeId: number;
  newTill: NewTill;
};
export type DeleteTillApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillApiArg = {
  tillId: number;
  nodeId: number;
};
export type RemoveFromTerminalApiResponse = /** status 200 Successful Response */ any;
export type RemoveFromTerminalApiArg = {
  tillId: number;
  nodeId: number;
};
export type SwitchTerminalApiResponse = /** status 200 Successful Response */ any;
export type SwitchTerminalApiArg = {
  tillId: number;
  nodeId: number;
  switchTerminalPayload: SwitchTerminalPayload;
};
export type ListTillLayoutsApiResponse = /** status 200 Successful Response */ NormalizedListTillLayoutInt;
export type ListTillLayoutsApiArg = {
  nodeId: number;
};
export type CreateTillLayoutApiResponse = /** status 200 Successful Response */ NewTillLayout;
export type CreateTillLayoutApiArg = {
  nodeId: number;
  newTillLayout: NewTillLayout;
};
export type GetTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type GetTillLayoutApiArg = {
  layoutId: number;
  nodeId: number;
};
export type UpdateTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type UpdateTillLayoutApiArg = {
  layoutId: number;
  nodeId: number;
  newTillLayout: NewTillLayout;
};
export type DeleteTillLayoutApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillLayoutApiArg = {
  layoutId: number;
  nodeId: number;
};
export type ListTillProfilesApiResponse = /** status 200 Successful Response */ NormalizedListTillProfileInt;
export type ListTillProfilesApiArg = {
  nodeId: number;
};
export type CreateTillProfileApiResponse = /** status 200 Successful Response */ NewTillProfile;
export type CreateTillProfileApiArg = {
  nodeId: number;
  newTillProfile: NewTillProfile;
};
export type GetTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type GetTillProfileApiArg = {
  profileId: number;
  nodeId: number;
};
export type UpdateTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type UpdateTillProfileApiArg = {
  profileId: number;
  nodeId: number;
  newTillProfile: NewTillProfile;
};
export type DeleteTillProfileApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillProfileApiArg = {
  profileId: number;
  nodeId: number;
};
export type ListTillButtonsApiResponse = /** status 200 Successful Response */ NormalizedListTillButtonInt;
export type ListTillButtonsApiArg = {
  nodeId: number;
};
export type CreateTillButtonApiResponse = /** status 200 Successful Response */ NewTillButton;
export type CreateTillButtonApiArg = {
  nodeId: number;
  newTillButton: NewTillButton;
};
export type GetTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type GetTillButtonApiArg = {
  buttonId: number;
  nodeId: number;
};
export type UpdateTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type UpdateTillButtonApiArg = {
  buttonId: number;
  nodeId: number;
  newTillButton: NewTillButton;
};
export type DeleteTillButtonApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillButtonApiArg = {
  buttonId: number;
  nodeId: number;
};
export type ListRegisterStockingsApiResponse =
  /** status 200 Successful Response */ NormalizedListCashRegisterStockingInt;
export type ListRegisterStockingsApiArg = {
  nodeId: number;
};
export type CreateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type CreateRegisterStockingApiArg = {
  nodeId: number;
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type UpdateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type UpdateRegisterStockingApiArg = {
  stockingId: number;
  nodeId: number;
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type DeleteRegisterStockingApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterStockingApiArg = {
  stockingId: number;
  nodeId: number;
};
export type ListCashRegistersAdminApiResponse = /** status 200 Successful Response */ NormalizedListCashRegisterInt;
export type ListCashRegistersAdminApiArg = {
  nodeId: number;
};
export type CreateRegisterApiResponse = /** status 200 Successful Response */ CashRegister;
export type CreateRegisterApiArg = {
  nodeId: number;
  newCashRegister: NewCashRegister;
};
export type GetCashRegisterAdminApiResponse = /** status 200 Successful Response */ CashRegister;
export type GetCashRegisterAdminApiArg = {
  registerId: number;
  nodeId: number;
};
export type UpdateRegisterApiResponse = /** status 200 Successful Response */ any;
export type UpdateRegisterApiArg = {
  registerId: number;
  nodeId: number;
  newCashRegister: NewCashRegister;
};
export type DeleteRegisterApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterApiArg = {
  registerId: number;
  nodeId: number;
};
export type GetCashierShiftsForRegisterApiResponse =
  /** status 200 Successful Response */ NormalizedListCashierShiftInt;
export type GetCashierShiftsForRegisterApiArg = {
  registerId: number;
  nodeId: number;
};
export type ListTransactionsApiResponse = /** status 200 Successful Response */ NormalizedListTransactionInt;
export type ListTransactionsApiArg = {
  registerId: number;
  nodeId: number;
};
export type TransferRegisterApiResponse = /** status 200 Successful Response */ any;
export type TransferRegisterApiArg = {
  nodeId: number;
  transferRegisterPayload: TransferRegisterPayload;
};
export type AssignRegisterApiResponse = /** status 200 Successful Response */ any;
export type AssignRegisterApiArg = {
  nodeId: number;
  assignRegisterPayload: AssignRegisterPayload;
};
export type ModifyRegisterBalanceApiResponse = /** status 200 Successful Response */ any;
export type ModifyRegisterBalanceApiArg = {
  nodeId: number;
  modifyRegisterBalancePayload: ModifyRegisterBalancePayload;
};
export type GetPublicConfigApiResponse = /** status 200 Successful Response */ Config;
export type GetPublicConfigApiArg = void;
export type ListConfigEntriesApiResponse = /** status 200 Successful Response */ NormalizedListConfigEntryStr;
export type ListConfigEntriesApiArg = void;
export type SetConfigEntryApiResponse = /** status 200 Successful Response */ ConfigEntry;
export type SetConfigEntryApiArg = {
  configEntry: ConfigEntry;
};
export type GetGlobalEmailConfigApiResponse = /** status 200 Successful Response */ GlobalEmailConfig;
export type GetGlobalEmailConfigApiArg = void;
export type UpdateGlobalEmailConfigApiResponse = /** status 200 Successful Response */ GlobalEmailConfig;
export type UpdateGlobalEmailConfigApiArg = {
  globalEmailConfig: GlobalEmailConfig;
};
export type GetGlobalSumupConfigApiResponse = /** status 200 Successful Response */ GlobalSumUpConfig;
export type GetGlobalSumupConfigApiArg = void;
export type UpdateGlobalSumupConfigApiResponse = /** status 200 Successful Response */ GlobalSumUpConfig;
export type UpdateGlobalSumupConfigApiArg = {
  globalSumUpConfig: GlobalSumUpConfig;
};
export type SendGlobalEmailTestApiResponse = /** status 200 Successful Response */ {
  [key: string]: string;
};
export type SendGlobalEmailTestApiArg = void;
export type ListSystemAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type ListSystemAccountsApiArg = {
  nodeId: number;
};
export type FindAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type FindAccountsApiArg = {
  nodeId: number;
  findAccountPayload: FindAccountPayload;
};
export type GetAccountApiResponse = /** status 200 Successful Response */ AccountRead;
export type GetAccountApiArg = {
  accountId: number;
  nodeId: number;
};
export type DisableAccountApiResponse = /** status 200 Successful Response */ any;
export type DisableAccountApiArg = {
  accountId: number;
  nodeId: number;
};
export type UpdateBalanceApiResponse = /** status 200 Successful Response */ any;
export type UpdateBalanceApiArg = {
  accountId: number;
  nodeId: number;
  updateBalancePayload: UpdateBalancePayload;
};
export type UpdateVoucherAmountApiResponse = /** status 200 Successful Response */ any;
export type UpdateVoucherAmountApiArg = {
  accountId: number;
  nodeId: number;
  updateVoucherAmountPayload: UpdateVoucherAmountPayload;
};
export type TransferBalanceApiResponse = /** status 200 Successful Response */ any;
export type TransferBalanceApiArg = {
  nodeId: number;
  transferBalancePayload: TransferBalancePayload;
};
export type UpdateAccountCommentApiResponse = /** status 200 Successful Response */ AccountRead;
export type UpdateAccountCommentApiArg = {
  accountId: number;
  nodeId: number;
  updateAccountCommentPayload: UpdateAccountCommentPayload;
};
export type ListOrdersByTillApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersByTillApiArg = {
  tillId: number;
  nodeId: number;
};
export type ListOrdersFilteredApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersFilteredApiArg = {
  nodeId: number;
  fromTimestamp?: string | null;
  toTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  limit?: number | null;
  offset?: number | null;
  selectedDates?: string[] | null;
};
export type ListOrdersApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersApiArg = {
  nodeId: number;
  customerAccountId: number;
};
export type GetOrderApiResponse = /** status 200 Successful Response */ OrderRead;
export type GetOrderApiArg = {
  orderId: number;
  nodeId: number;
};
export type CancelOrderApiResponse = /** status 200 Successful Response */ any;
export type CancelOrderApiArg = {
  orderId: number;
  nodeId: number;
};
export type GetOrderBonApiResponse = /** status 200 Successful Response */ BonJsonRead;
export type GetOrderBonApiArg = {
  orderId: number;
};
export type EditOrderApiResponse = /** status 200 Successful Response */ CompletedSaleProductsRead;
export type EditOrderApiArg = {
  orderId: number;
  nodeId: number;
  editSaleProducts: EditSaleProducts;
};
export type ListCashiersApiResponse = /** status 200 Successful Response */ NormalizedListCashierInt;
export type ListCashiersApiArg = {
  nodeId: number;
};
export type GetCashierApiResponse = /** status 200 Successful Response */ CashierRead;
export type GetCashierApiArg = {
  cashierId: number;
  nodeId: number;
};
export type GetCashierShiftsApiResponse = /** status 200 Successful Response */ NormalizedListCashierShiftInt;
export type GetCashierShiftsApiArg = {
  cashierId: number;
  nodeId: number;
};
export type GetCashierShiftStatsApiResponse = /** status 200 Successful Response */ CashierShiftStatsRead;
export type GetCashierShiftStatsApiArg = {
  cashierId: number;
  nodeId: number;
  shiftId?: number | null;
};
export type CloseOutCashierApiResponse = /** status 200 Successful Response */ CloseOutResult;
export type CloseOutCashierApiArg = {
  cashierId: number;
  nodeId: number;
  closeOut: CloseOut;
};
export type GetProductStatsApiResponse = /** status 200 Successful Response */ ProductStats;
export type GetProductStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetVoucherStatsApiResponse = /** status 200 Successful Response */ VoucherStats;
export type GetVoucherStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetEntryStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetEntryStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetTopUpStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetTopUpStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetPayOutStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetPayOutStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetDashboardOverviewApiResponse = /** status 200 Successful Response */ DashboardOverview;
export type GetDashboardOverviewApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetRevenueByCounterApiResponse = /** status 200 Successful Response */ RevenueByCounter;
export type GetRevenueByCounterApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetPaymentMethodStatsApiResponse = /** status 200 Successful Response */ PaymentMethodBreakdown;
export type GetPaymentMethodStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
  tillId?: number | null;
  subnodeId?: number | null;
  selectedDates?: string[] | null;
};
export type GetAvailableDatesApiResponse = /** status 200 Successful Response */ string[];
export type GetAvailableDatesApiArg = {
  nodeId: number;
  subnodeId?: number | null;
};
export type GetRevenuePredictionApiResponse = /** status 200 Successful Response */ RevenuePrediction;
export type GetRevenuePredictionApiArg = {
  nodeId: number;
  tillId?: number | null;
  subnodeId?: number | null;
};
export type ListTicketsApiResponse = /** status 200 Successful Response */ NormalizedListTicketInt;
export type ListTicketsApiArg = {
  nodeId: number;
};
export type CreateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type CreateTicketApiArg = {
  nodeId: number;
  newTicket: NewTicket;
};
export type GetTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type GetTicketApiArg = {
  ticketId: number;
  nodeId: number;
};
export type UpdateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type UpdateTicketApiArg = {
  ticketId: number;
  nodeId: number;
  newTicket: NewTicket;
};
export type DeleteTicketApiResponse = /** status 200 Successful Response */ any;
export type DeleteTicketApiArg = {
  ticketId: number;
  nodeId: number;
};
export type CreateUserTagSecretApiResponse = /** status 200 Successful Response */ UserTagSecret;
export type CreateUserTagSecretApiArg = {
  nodeId: number;
  newUserTagSecret: NewUserTagSecret;
};
export type ListUserTagSecretsApiResponse = /** status 200 Successful Response */ UserTagSecret[];
export type ListUserTagSecretsApiArg = {
  nodeId: number;
};
export type CreateUserTagsApiResponse = /** status 200 Successful Response */ any;
export type CreateUserTagsApiArg = {
  nodeId: number;
  newUserTags: NewUserTag[];
};
export type FindUserTagsApiResponse = /** status 200 Successful Response */ NormalizedListUserTagDetailInt;
export type FindUserTagsApiArg = {
  nodeId: number;
  findUserTagPayload: FindUserTagPayload;
};
export type CountTagsWithoutAccountsApiResponse = /** status 200 Successful Response */ number;
export type CountTagsWithoutAccountsApiArg = {
  nodeId: number;
};
export type CreateAccountsForUserTagsApiResponse = /** status 200 Successful Response */ CreateAccountsResponse;
export type CreateAccountsForUserTagsApiArg = {
  nodeId: number;
  createAccountsPayload: CreateAccountsPayload;
};
export type GetUserTagDetailApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type GetUserTagDetailApiArg = {
  userTagId: number;
  nodeId: number;
};
export type UpdateUserTagCommentApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagCommentApiArg = {
  userTagId: number;
  nodeId: number;
  updateCommentPayload: UpdateCommentPayload;
};
export type UpdateUserTagVipStatusApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagVipStatusApiArg = {
  userTagId: number;
  nodeId: number;
  updateVipStatusPayload: UpdateVipStatusPayload;
};
export type UpdateUserTagGroupTagApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagGroupTagApiArg = {
  userTagId: number;
  nodeId: number;
  updateGroupTagPayload: UpdateGroupTagPayload;
};
export type UpdateUserTagAccountCreationBlockedApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagAccountCreationBlockedApiArg = {
  userTagId: number;
  nodeId: number;
  updateAccountCreationBlockedPayload: UpdateAccountCreationBlockedPayload;
};
export type ListTsesApiResponse = /** status 200 Successful Response */ NormalizedListTseInt;
export type ListTsesApiArg = {
  nodeId: number;
};
export type CreateTseApiResponse = /** status 200 Successful Response */ Tse;
export type CreateTseApiArg = {
  nodeId: number;
  newTse: NewTse;
};
export type UpdateTseApiResponse = /** status 200 Successful Response */ Tse;
export type UpdateTseApiArg = {
  tseId: number;
  nodeId: number;
  updateTse: UpdateTse;
};
export type ListPayoutRunsApiResponse = /** status 200 Successful Response */ NormalizedListPayoutRunWithStatsInt;
export type ListPayoutRunsApiArg = {
  nodeId: number;
};
export type CreatePayoutRunApiResponse = /** status 200 Successful Response */ PayoutRunWithStats;
export type CreatePayoutRunApiArg = {
  nodeId: number;
  newPayoutRun: NewPayoutRun;
};
export type PendingPayoutDetailApiResponse = /** status 200 Successful Response */ PendingPayoutDetail;
export type PendingPayoutDetailApiArg = {
  nodeId: number;
};
export type PayoutRunPayoutsApiResponse = /** status 200 Successful Response */ PayoutRead[];
export type PayoutRunPayoutsApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type PayoutRunCsvExportApiResponse = /** status 200 Successful Response */ string;
export type PayoutRunCsvExportApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type PayoutRunSepaXmlApiResponse = /** status 200 Successful Response */ string;
export type PayoutRunSepaXmlApiArg = {
  payoutRunId: number;
  nodeId: number;
  createSepaXmlPayload: CreateSepaXmlPayload;
};
export type PreviousPayoutRunSepaXmlApiResponse = /** status 200 Successful Response */ string;
export type PreviousPayoutRunSepaXmlApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type SetPayoutRunAsDoneApiResponse = /** status 200 Successful Response */ any;
export type SetPayoutRunAsDoneApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type RevokePayoutRunApiResponse = /** status 200 Successful Response */ any;
export type RevokePayoutRunApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type GetTreeForCurrentUserApiResponse = /** status 200 Successful Response */ NodeSeenByUser;
export type GetTreeForCurrentUserApiArg = void;
export type CreateNodeApiResponse = /** status 200 Successful Response */ Node;
export type CreateNodeApiArg = {
  nodeId: number;
  newNode: NewNode;
};
export type UpdateNodeApiResponse = /** status 200 Successful Response */ Node;
export type UpdateNodeApiArg = {
  nodeId: number;
  newNode: NewNode;
};
export type ArchiveNodeApiResponse = /** status 200 Successful Response */ any;
export type ArchiveNodeApiArg = {
  nodeId: number;
};
export type CreateEventApiResponse = /** status 200 Successful Response */ Node;
export type CreateEventApiArg = {
  nodeId: number;
  newEvent: NewEvent;
};
export type CopyEventApiResponse = /** status 200 Successful Response */ Node;
export type CopyEventApiArg = {
  nodeId: number;
  copyEventRequest: CopyEventRequest;
};
export type UpdateEventApiResponse = /** status 200 Successful Response */ Node;
export type UpdateEventApiArg = {
  nodeId: number;
  updateEvent: UpdateEvent;
};
export type GetRestrictedEventSettingsApiResponse = /** status 200 Successful Response */ RestrictedEventSettings;
export type GetRestrictedEventSettingsApiArg = {
  nodeId: number;
};
export type ClearLegacySumupSettingsApiResponse = /** status 200 Successful Response */ RestrictedEventSettings;
export type ClearLegacySumupSettingsApiArg = {
  nodeId: number;
};
export type DeleteNodeApiResponse = /** status 200 Successful Response */ any;
export type DeleteNodeApiArg = {
  nodeId: number;
};
export type GenerateTestBonApiResponse = /** status 200 Successful Response */ BonJsonRead;
export type GenerateTestBonApiArg = {
  nodeId: number;
};
export type GenerateTestReportApiResponse = /** status 200 Successful Response */ any;
export type GenerateTestReportApiArg = {
  nodeId: number;
};
export type GenerateRevenueReportApiResponse = /** status 200 Successful Response */ any;
export type GenerateRevenueReportApiArg = {
  nodeId: number;
};
export type GetNodeSumupLinkStatusApiResponse = /** status 200 Successful Response */ NodeSumUpConnectionStatus;
export type GetNodeSumupLinkStatusApiArg = {
  nodeId: number;
};
export type DeleteNodeSumupLinkApiResponse = /** status 200 Successful Response */ NodeSumUpConnectionStatus;
export type DeleteNodeSumupLinkApiArg = {
  nodeId: number;
};
export type ConfigureSumupTokenApiResponse = /** status 200 Successful Response */ NodeSumUpConnectionStatus;
export type ConfigureSumupTokenApiArg = {
  nodeId: number;
  sumUpTokenPayload: SumUpTokenPayload;
};
export type UploadEventBannerApiResponse = /** status 200 Successful Response */ any;
export type UploadEventBannerApiArg = {
  nodeId: number;
  bodyUploadEventBannerTreeEventsNodeIdBannerPost: BodyUploadEventBannerTreeEventsNodeIdBannerPost;
};
export type DeleteEventBannerApiResponse = /** status 200 Successful Response */ any;
export type DeleteEventBannerApiArg = {
  nodeId: number;
};
export type GetEventBannerApiResponse = /** status 200 Successful Response */ any;
export type GetEventBannerApiArg = {
  nodeId: number;
};
export type ListSumupCheckoutsApiResponse = /** status 200 Successful Response */ SumUpCheckout[];
export type ListSumupCheckoutsApiArg = {
  nodeId: number;
};
export type ListSumupTransactionsApiResponse = /** status 200 Successful Response */ SumUpTransaction[];
export type ListSumupTransactionsApiArg = {
  nodeId: number;
  limit?: number;
  transactionCode?: string | null;
  newestTime?: string | null;
};
export type GetSumupCheckoutApiResponse = /** status 200 Successful Response */ SumUpCheckout;
export type GetSumupCheckoutApiArg = {
  checkoutId: string;
  nodeId: number;
};
export type FindCustomersApiResponse = /** status 200 Successful Response */ CustomerRead[];
export type FindCustomersApiArg = {
  nodeId: number;
  findCustomerPayload: FindCustomerPayload;
};
export type FindCustomerTagSwapCandidatesApiResponse = /** status 200 Successful Response */ UserTagSwapCandidate[];
export type FindCustomerTagSwapCandidatesApiArg = {
  nodeId: number;
  findTagSwapCandidatesPayload: FindTagSwapCandidatesPayload;
};
export type SwapCustomerTagApiResponse = /** status 200 Successful Response */ SwapCustomerTagResponse;
export type SwapCustomerTagApiArg = {
  nodeId: number;
  swapCustomerTagPayload: SwapCustomerTagPayload;
};
export type GetCustomerApiResponse = /** status 200 Successful Response */ CustomerRead;
export type GetCustomerApiArg = {
  customerId: number;
  nodeId: number;
};
export type PreventCustomerPayoutApiResponse = /** status 200 Successful Response */ any;
export type PreventCustomerPayoutApiArg = {
  customerId: number;
  nodeId: number;
};
export type AllowCustomerPayoutApiResponse = /** status 200 Successful Response */ any;
export type AllowCustomerPayoutApiArg = {
  customerId: number;
  nodeId: number;
};
export type ListTerminalsApiResponse = /** status 200 Successful Response */ NormalizedListTerminalInt;
export type ListTerminalsApiArg = {
  nodeId: number;
};
export type CreateTerminalApiResponse = /** status 200 Successful Response */ Terminal;
export type CreateTerminalApiArg = {
  nodeId: number;
  newTerminal: NewTerminal;
};
export type GetTerminalApiResponse = /** status 200 Successful Response */ Terminal;
export type GetTerminalApiArg = {
  terminalId: number;
  nodeId: number;
};
export type UpdateTerminalApiResponse = /** status 200 Successful Response */ Terminal;
export type UpdateTerminalApiArg = {
  terminalId: number;
  nodeId: number;
  newTerminal: NewTerminal;
};
export type DeleteTerminalApiResponse = /** status 200 Successful Response */ any;
export type DeleteTerminalApiArg = {
  terminalId: number;
  nodeId: number;
};
export type LogoutTerminalApiResponse = /** status 200 Successful Response */ any;
export type LogoutTerminalApiArg = {
  terminalId: number;
  nodeId: number;
};
export type SwitchTillApiResponse = /** status 200 Successful Response */ any;
export type SwitchTillApiArg = {
  terminalId: number;
  nodeId: number;
  switchTillPayload: SwitchTillPayload;
};
export type ForceLogoutUserApiResponse = /** status 200 Successful Response */ any;
export type ForceLogoutUserApiArg = {
  terminalId: number;
  nodeId: number;
};
export type LoginUserApiResponse = /** status 200 Successful Response */ any;
export type LoginUserApiArg = {
  terminalId: number;
  nodeId: number;
  terminalUserLoginPayload: TerminalUserLoginPayload;
};
export type GetTransactionApiResponse = /** status 200 Successful Response */ TransactionRead;
export type GetTransactionApiArg = {
  transactionId: number;
  nodeId: number;
};
export type ListMappingsApiResponse = /** status 200 Successful Response */ HeadwindDeviceMappingWithTerminal[];
export type ListMappingsApiArg = {
  nodeId: number;
};
export type CreateOrUpdateMappingApiResponse = /** status 201 Successful Response */ HeadwindDeviceMappingWithTerminal;
export type CreateOrUpdateMappingApiArg = {
  nodeId: number;
  createHeadwindMappingPayload: CreateHeadwindMappingPayload;
};
export type ListHeadwindDevicesApiResponse = /** status 200 Successful Response */ HeadwindDeviceWithMapping[];
export type ListHeadwindDevicesApiArg = {
  nodeId: number;
  page?: number;
  pageSize?: number;
  search?: string | null;
};
export type DeleteMappingApiResponse = unknown;
export type DeleteMappingApiArg = {
  terminalId: number;
  nodeId: number;
};
export type RefreshMappingTokenApiResponse = /** status 200 Successful Response */ HeadwindDeviceMappingWithTerminal;
export type RefreshMappingTokenApiArg = {
  terminalId: number;
  nodeId: number;
};
export type ListLlmToolsApiResponse = /** status 200 Successful Response */ ToolDescription[];
export type ListLlmToolsApiArg = void;
export type ListNodesLlmApiResponse = /** status 200 Successful Response */ NodeSeenByUser[];
export type ListNodesLlmApiArg = {
  parentNodeId: number;
  nameQuery?: string | null;
};
export type CreateNodeLlmApiResponse = /** status 200 Successful Response */ Node;
export type CreateNodeLlmApiArg = {
  createNodePayload: CreateNodePayload;
};
export type CreateProductLlmApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductLlmApiArg = {
  createProductPayload: CreateProductPayload;
};
export type ListProductsLlmApiResponse = /** status 200 Successful Response */ Product[];
export type ListProductsLlmApiArg = {
  nodeId: number;
  includeSubtree?: boolean;
};
export type CreateCashRegisterLlmApiResponse = /** status 200 Successful Response */ CashRegister;
export type CreateCashRegisterLlmApiArg = {
  createCashRegisterPayload: CreateCashRegisterPayload;
};
export type ListCashRegistersLlmApiResponse = /** status 200 Successful Response */ CashRegister[];
export type ListCashRegistersLlmApiArg = {
  nodeId: number;
  includeSubtree?: boolean;
};
export type CreateTillLlmApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillLlmApiArg = {
  createTillPayload: CreateTillPayload;
};
export type ListTillsLlmApiResponse = /** status 200 Successful Response */ Till[];
export type ListTillsLlmApiArg = {
  nodeId: number;
};
export type CreateTillButtonLlmApiResponse = /** status 200 Successful Response */ TillButton;
export type CreateTillButtonLlmApiArg = {
  createTillButtonPayload: CreateTillButtonPayload;
};
export type ListTillButtonsLlmApiResponse = /** status 200 Successful Response */ TillButton[];
export type ListTillButtonsLlmApiArg = {
  nodeId: number;
};
export type CreateTillLayoutLlmApiResponse = /** status 200 Successful Response */ TillLayout;
export type CreateTillLayoutLlmApiArg = {
  createTillLayoutPayload: CreateTillLayoutPayload;
};
export type ListTillLayoutsLlmApiResponse = /** status 200 Successful Response */ TillLayout[];
export type ListTillLayoutsLlmApiArg = {
  nodeId: number;
};
export type CreateTillProfileLlmApiResponse = /** status 200 Successful Response */ TillProfile;
export type CreateTillProfileLlmApiArg = {
  createTillProfilePayload: CreateTillProfilePayload;
};
export type ListTillProfilesLlmApiResponse = /** status 200 Successful Response */ TillProfile[];
export type ListTillProfilesLlmApiArg = {
  nodeId: number;
};
export type CreateTerminalLlmApiResponse = /** status 200 Successful Response */ Terminal;
export type CreateTerminalLlmApiArg = {
  createTerminalPayload: CreateTerminalPayload;
};
export type ListTerminalsLlmApiResponse = /** status 200 Successful Response */ Terminal[];
export type ListTerminalsLlmApiArg = {
  nodeId: number;
};
export type CreateTaxRateLlmApiResponse = /** status 200 Successful Response */ TaxRate;
export type CreateTaxRateLlmApiArg = {
  createTaxRatePayload: CreateTaxRatePayload;
};
export type ListTaxRatesLlmApiResponse = /** status 200 Successful Response */ TaxRate[];
export type ListTaxRatesLlmApiArg = {
  nodeId: number;
};
export type ListEventsLlmApiResponse = /** status 200 Successful Response */ EventSummary[];
export type ListEventsLlmApiArg = {
  nameQuery?: string | null;
};
export type ListEntryAreasApiResponse = /** status 200 Successful Response */ NormalizedListEntryAreaInt;
export type ListEntryAreasApiArg = {
  nodeId: number;
};
export type CreateEntryAreaApiResponse = /** status 200 Successful Response */ EntryArea;
export type CreateEntryAreaApiArg = {
  nodeId: number;
  newEntryArea: NewEntryArea;
};
export type GetEntryAreaApiResponse = /** status 200 Successful Response */ EntryArea;
export type GetEntryAreaApiArg = {
  areaId: number;
  nodeId: number;
};
export type UpdateEntryAreaApiResponse = /** status 200 Successful Response */ EntryArea;
export type UpdateEntryAreaApiArg = {
  areaId: number;
  nodeId: number;
  newEntryArea: NewEntryArea;
};
export type DeleteEntryAreaApiResponse = unknown;
export type DeleteEntryAreaApiArg = {
  areaId: number;
  nodeId: number;
};
export type ListEntryAreaGroupsApiResponse = /** status 200 Successful Response */ EntryAreaGroupWithGroup[];
export type ListEntryAreaGroupsApiArg = {
  areaId: number;
  nodeId: number;
};
export type AssignEntryGroupToAreaApiResponse = /** status 200 Successful Response */ EntryAreaGroup;
export type AssignEntryGroupToAreaApiArg = {
  areaId: number;
  nodeId: number;
  entryAreaGroupAssignPayload: EntryAreaGroupAssignPayload;
};
export type RemoveEntryGroupFromAreaApiResponse = unknown;
export type RemoveEntryGroupFromAreaApiArg = {
  areaId: number;
  groupId: number;
  nodeId: number;
};
export type ListEntryAreaGroupWindowsApiResponse = /** status 200 Successful Response */ EntryAreaGroupWindow[];
export type ListEntryAreaGroupWindowsApiArg = {
  areaId: number;
  groupId: number;
  nodeId: number;
};
export type CreateEntryAreaGroupWindowApiResponse = /** status 200 Successful Response */ EntryAreaGroupWindow;
export type CreateEntryAreaGroupWindowApiArg = {
  areaId: number;
  groupId: number;
  nodeId: number;
  newEntryAreaGroupWindow: NewEntryAreaGroupWindow;
};
export type UpdateEntryAreaGroupWindowApiResponse = /** status 200 Successful Response */ EntryAreaGroupWindow;
export type UpdateEntryAreaGroupWindowApiArg = {
  areaId: number;
  groupId: number;
  windowId: number;
  nodeId: number;
  newEntryAreaGroupWindow: NewEntryAreaGroupWindow;
};
export type DeleteEntryAreaGroupWindowApiResponse = unknown;
export type DeleteEntryAreaGroupWindowApiArg = {
  areaId: number;
  groupId: number;
  windowId: number;
  nodeId: number;
};
export type ListEntryGroupsApiResponse = /** status 200 Successful Response */ NormalizedListEntryGroupInt;
export type ListEntryGroupsApiArg = {
  nodeId: number;
};
export type CreateEntryGroupApiResponse = /** status 200 Successful Response */ EntryGroup;
export type CreateEntryGroupApiArg = {
  nodeId: number;
  newEntryGroup: NewEntryGroup;
};
export type GetEntryGroupApiResponse = /** status 200 Successful Response */ EntryGroup;
export type GetEntryGroupApiArg = {
  groupId: number;
  nodeId: number;
};
export type UpdateEntryGroupApiResponse = /** status 200 Successful Response */ EntryGroup;
export type UpdateEntryGroupApiArg = {
  groupId: number;
  nodeId: number;
  newEntryGroup: NewEntryGroup;
};
export type DeleteEntryGroupApiResponse = unknown;
export type DeleteEntryGroupApiArg = {
  groupId: number;
  nodeId: number;
};
export type ListEntryGroupMembersApiResponse = /** status 200 Successful Response */ EntryGroupMember[];
export type ListEntryGroupMembersApiArg = {
  groupId: number;
  nodeId: number;
};
export type AddEntryGroupMemberApiResponse = /** status 200 Successful Response */ EntryGroupMember;
export type AddEntryGroupMemberApiArg = {
  groupId: number;
  nodeId: number;
  entryGroupMemberAddPayload: EntryGroupMemberAddPayload;
};
export type AddEntryGroupMembersByGroupTagApiResponse = /** status 200 Successful Response */ EntryGroupMember[];
export type AddEntryGroupMembersByGroupTagApiArg = {
  groupId: number;
  nodeId: number;
  entryGroupMemberAddByGroupTagPayload: EntryGroupMemberAddByGroupTagPayload;
};
export type RemoveEntryGroupMemberApiResponse = unknown;
export type RemoveEntryGroupMemberApiArg = {
  groupId: number;
  userTagId: number;
  nodeId: number;
};
export type ListEntryScanLogsApiResponse = /** status 200 Successful Response */ EntryScanLog[];
export type ListEntryScanLogsApiArg = {
  nodeId: number;
  areaId?: number | null;
  groupId?: number | null;
  terminalId?: number | null;
  direction?: EntryDirection | null;
  allowed?: boolean | null;
  userTagUid?: number | null;
  fromTime?: string | null;
  toTime?: string | null;
  limit?: number;
  offset?: number;
};
export type ExportEntryScanLogsApiResponse = /** status 200 Successful Response */ string;
export type ExportEntryScanLogsApiArg = {
  nodeId: number;
  areaId?: number | null;
  groupId?: number | null;
  terminalId?: number | null;
  direction?: EntryDirection | null;
  allowed?: boolean | null;
  userTagUid?: number | null;
  fromTime?: string | null;
  toTime?: string | null;
  limit?: number;
  offset?: number;
};
export type ProductRestriction = "under_16" | "under_18";
export type ProductType = "discount" | "topup" | "payout" | "money_transfer" | "imbalance" | "user_defined" | "ticket";
export type Product = {
  name: string;
  price: number | null;
  fixed_price: boolean;
  price_in_vouchers?: number | null;
  tax_rate_id: number;
  restrictions: ProductRestriction[];
  is_locked: boolean;
  is_returnable: boolean;
  target_account_id?: number | null;
  node_id: number;
  id: number;
  tax_name: string;
  tax_rate: number;
  has_bookings?: boolean;
  type: ProductType;
  price_per_voucher?: number | null;
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
  tax_rate_id: number;
  restrictions?: ProductRestriction[];
  is_locked?: boolean;
  is_returnable?: boolean;
  target_account_id?: number | null;
};
export type User = {
  login: string;
  display_name: string;
  user_tag_pin?: string | null;
  user_tag_uid?: number | null;
  description?: string | null;
  email?: string | null;
  node_id: number;
  user_tag_id?: number | null;
  transport_account_id?: number | null;
  id: number;
};
export type UserRead = {
  login: string;
  display_name: string;
  user_tag_pin?: string | null;
  user_tag_uid?: number | null;
  description?: string | null;
  email?: string | null;
  node_id: number;
  user_tag_id?: number | null;
  transport_account_id?: number | null;
  id: number;
  user_tag_uid_hex: string | null;
};
export type NormalizedListUserInt = {
  ids: number[];
  entities: {
    [key: string]: User;
  };
};
export type Privilege =
  | "node_administration"
  | "global_email_management"
  | "customer_management"
  | "payout_management"
  | "entry_management"
  | "create_user"
  | "allow_privileged_role_assignment"
  | "user_management"
  | "view_node_stats"
  | "cash_transport"
  | "terminal_login"
  | "supervised_terminal_login"
  | "can_book_orders"
  | "can_topup"
  | "grant_free_tickets"
  | "grant_vouchers";
export type CreateUserPayload = {
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_pin?: string | null;
  user_tag_uid_hex?: string | null;
  email?: string | null;
  password?: string | null;
};
export type AcceptInvitationPayload = {
  token: string;
  password: string;
};
export type UpdateUserPayload = {
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_pin?: string | null;
  user_tag_uid_hex?: string | null;
  email?: string | null;
};
export type ChangeUserPasswordPayload = {
  new_password: string;
};
export type UserInvitation = {
  id: number;
  user_id: number;
  token: string;
  node_id: number;
  created_at: string;
  expires_at: string;
  accepted_at?: string | null;
  created_by?: number | null;
};
export type UserRole = {
  name: string;
  is_privileged?: boolean;
  privileges: Privilege[];
  id: number;
  node_id: number;
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
export type UserToRoles = {
  user_id: number;
  role_ids: number[];
  terminal_only?: boolean;
  node_id: number;
};
export type NewUserToRoles = {
  user_id: number;
  role_ids: number[];
  terminal_only?: boolean;
};
export type TaxRate = {
  name: string;
  rate: number;
  description: string;
  id: number;
  node_id: number;
};
export type NormalizedListTaxRateInt = {
  ids: number[];
  entities: {
    [key: string]: TaxRate;
  };
};
export type NewTaxRate = {
  name: string;
  rate: number;
  description: string;
};
export type CurrentUser = {
  node_id: number;
  id: number;
  login: string;
  display_name: string;
  active_role_id?: number | null;
  active_role_name?: string | null;
  privileges: Privilege[];
  description?: string | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
  email?: string | null;
  transport_account_id?: number | null;
  cash_register_id?: number | null;
};
export type UserLoginSuccess = {
  user: CurrentUser;
  token: string;
};
export type NodeChoice = {
  node_id: number;
  name: string;
  description: string;
};
export type UserLoginResult = {
  success: UserLoginSuccess | null;
  available_nodes: NodeChoice[] | null;
};
export type LoginPayload = {
  username: string;
  password: string;
  node_id?: number | null;
};
export type ChangePasswordPayload = {
  old_password: string;
  new_password: string;
};
export type UpdateCurrentUserProfilePayload = {
  email?: string | null;
};
export type Till = {
  name: string;
  description?: string | null;
  active_shift?: string | null;
  active_profile_id: number;
  terminal_id?: number | null;
  node_id: number;
  id: number;
  z_nr: number;
  active_cash_register_id?: number | null;
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
  terminal_id?: number | null;
};
export type SwitchTerminalPayload = {
  new_terminal_id: number;
};
export type TillLayout = {
  name: string;
  description: string;
  button_ids?: number[] | null;
  ticket_ids?: number[] | null;
  node_id: number;
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
  allow_ticket_vouchers: boolean;
  enable_ssp_payment: boolean;
  enable_cash_payment: boolean;
  enable_card_payment: boolean;
  node_id: number;
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
  allow_ticket_vouchers: boolean;
  enable_ssp_payment: boolean;
  enable_cash_payment: boolean;
  enable_card_payment: boolean;
};
export type TillButton = {
  name: string;
  product_ids: number[];
  node_id: number;
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
  node_id: number;
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
  node_id: number;
  id: number;
  current_cashier_id: number | null;
  current_till_id: number | null;
  balance: number;
  account_id: number;
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
export type CashierShift = {
  id: number;
  comment: string;
  cashier_id: number;
  cash_register_id: number | null;
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
export type PaymentMethod = "cash" | "sumup" | "tag" | "sumup_online";
export type OrderType =
  | "sale"
  | "cancel_sale"
  | "top_up"
  | "pay_out"
  | "ticket"
  | "money_transfer"
  | "money_transfer_imbalance"
  | "cashier_shift_start"
  | "cashier_shift_end";
export type LineItem = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_rate_id: number;
  tax_name: string;
  tax_rate: number;
  item_id: number;
  total_tax: number;
};
export type LineItemRead = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_rate_id: number;
  tax_name: string;
  tax_rate: number;
  item_id: number;
  total_tax: number;
  total_price: number;
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
  cash_register_id: number | null;
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_id: number | null;
  line_items: LineItem[];
};
export type OrderRead = {
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
  cash_register_id: number | null;
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_id: number | null;
  line_items: LineItemRead[];
  customer_tag_uid_hex: string | null;
};
export type Transaction = {
  id: number;
  conducting_user_id: number | null;
  description: string | null;
  source_account: number;
  target_account: number;
  order: Order | null;
  booked_at: string;
  amount: number;
  vouchers: number;
};
export type TransactionRead = {
  id: number;
  conducting_user_id: number | null;
  description: string | null;
  source_account: number;
  target_account: number;
  order: OrderRead | null;
  booked_at: string;
  amount: number;
  vouchers: number;
};
export type NormalizedListTransactionInt = {
  ids: number[];
  entities: {
    [key: string]: Transaction;
  };
};
export type TransferRegisterPayload = {
  source_cashier_id: number;
  target_cashier_id: number;
};
export type AssignRegisterPayload = {
  cashier_id: number;
  cash_register_id: number;
};
export type ModifyRegisterBalancePayload = {
  cashier_id: number;
  amount: number;
};
export type Config = {
  test_mode: boolean;
  test_mode_message: string;
  sumup_topup_enabled_globally: boolean;
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
export type GlobalEmailConfig = {
  email_enabled: boolean;
  email_default_sender?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  email_smtp_password?: string | null;
  invitation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
};
export type GlobalSumUpConfig = {
  sumup_affiliate_key?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
};
export type AccountType =
  | "private"
  | "sale_exit"
  | "cash_entry"
  | "cash_exit"
  | "cash_topup_source"
  | "cash_imbalance"
  | "cash_vault"
  | "sumup_entry"
  | "sumup_online_entry"
  | "transport"
  | "voucher_create"
  | "donation_exit"
  | "sepa_exit"
  | "cash_register";
export type UserTagHistoryEntry = {
  user_tag_id: number;
  user_tag_pin: string;
  user_tag_uid: number | null;
  account_id: number;
  comment?: string | null;
  mapping_was_valid_until: string;
};
export type UserTagHistoryEntryRead = {
  user_tag_id: number;
  user_tag_pin: string;
  user_tag_uid: number | null;
  account_id: number;
  comment?: string | null;
  mapping_was_valid_until: string;
  user_tag_uid_hex: string | null;
};
export type Account = {
  node_id: number;
  id: number;
  type: AccountType;
  name: string | null;
  comment: string | null;
  balance: number;
  vouchers: number;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  user_tag_comment?: string | null;
  restriction: ProductRestriction | null;
  is_vip?: boolean;
  vip_max_balance?: number | null;
  tag_history: UserTagHistoryEntry[];
};
export type AccountRead = {
  node_id: number;
  id: number;
  type: AccountType;
  name: string | null;
  comment: string | null;
  balance: number;
  vouchers: number;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  user_tag_comment?: string | null;
  restriction: ProductRestriction | null;
  is_vip?: boolean;
  vip_max_balance?: number | null;
  tag_history: UserTagHistoryEntryRead[];
  user_tag_uid_hex: string | null;
};
export type NormalizedListAccountInt = {
  ids: number[];
  entities: {
    [key: string]: AccountRead;
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
export type TransferBalancePayload = {
  source_account_id: number;
  target_account_id: number;
  amount: number;
};
export type UpdateAccountCommentPayload = {
  comment: string;
};
export type NormalizedListOrderInt = {
  ids: number[];
  entities: {
    [key: string]: Order;
  };
};
export type OrderWithTse = {
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
  cash_register_id: number | null;
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_id: number | null;
  line_items: LineItem[];
  signature_status: string;
  transaction_process_type?: string | null;
  transaction_process_data?: string | null;
  tse_transaction?: string | null;
  tse_signaturenr?: string | null;
  tse_start?: string | null;
  tse_end?: string | null;
  tse_hashalgo?: string | null;
  tse_time_format?: string | null;
  tse_signature?: string | null;
  tse_public_key?: string | null;
  node_id: number;
};
export type OrderWithTseRead = {
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
  cash_register_id: number | null;
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_id: number | null;
  line_items: LineItemRead[];
  signature_status: string;
  transaction_process_type?: string | null;
  transaction_process_data?: string | null;
  tse_transaction?: string | null;
  tse_signaturenr?: string | null;
  tse_start?: string | null;
  tse_end?: string | null;
  tse_hashalgo?: string | null;
  tse_time_format?: string | null;
  tse_signature?: string | null;
  tse_public_key?: string | null;
  node_id: number;
  customer_tag_uid_hex: string | null;
  tse_qr_code_text: string;
};
export type TaxRateAggregation = {
  tax_name: string;
  tax_rate: number;
  total_price: number;
  total_tax: number;
  total_no_tax: number;
};
export type BonConfig = {
  title: string;
  issuer: string;
  address: string;
  ust_id: string;
};
export type BonJson = {
  order: OrderWithTse;
  tax_rate_aggregations: TaxRateAggregation[];
  config: BonConfig;
  currency_identifier: string;
};
export type BonJsonRead = {
  order: OrderWithTseRead;
  tax_rate_aggregations: TaxRateAggregation[];
  config: BonConfig;
  currency_identifier: string;
};
export type PendingLineItem = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_rate_id: number;
  tax_name: string;
  tax_rate: number;
};
export type PendingLineItemRead = {
  quantity: number;
  product: Product;
  product_price: number;
  tax_rate_id: number;
  tax_name: string;
  tax_rate: number;
  total_price: number;
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
  customer_account_id: number | null;
  payment_method: PaymentMethod;
  line_items: PendingLineItem[];
  products: BookedProduct[];
  id: number;
  booked_at: string;
  cashier_id: number;
  till_id: number;
};
export type CompletedSaleProductsRead = {
  uuid: string;
  old_balance: number;
  new_balance: number;
  old_voucher_balance: number;
  new_voucher_balance: number;
  customer_account_id: number | null;
  payment_method: PaymentMethod;
  line_items: PendingLineItemRead[];
  products: BookedProduct[];
  id: number;
  booked_at: string;
  cashier_id: number;
  till_id: number;
  used_vouchers: number;
  item_count: number;
  total_price: number;
};
export type EditSaleProducts = {
  uuid: string;
  used_vouchers?: number | null;
  products: BookedProduct[];
};
export type Cashier = {
  node_id: number;
  id: number;
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
  transport_account_id?: number | null;
  cash_register_id?: number | null;
  cash_drawer_balance: number | null;
  terminal_ids: number[];
};
export type CashierRead = {
  node_id: number;
  id: number;
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
  transport_account_id?: number | null;
  cash_register_id?: number | null;
  cash_drawer_balance: number | null;
  terminal_ids: number[];
  user_tag_uid_hex: string | null;
};
export type NormalizedListCashierInt = {
  ids: number[];
  entities: {
    [key: string]: CashierRead;
  };
};
export type CashierProductStats = {
  product: Product;
  quantity: number;
};
export type CashierShiftStats = {
  booked_products: CashierProductStats[];
  orders: Order[];
};
export type CashierShiftStatsRead = {
  booked_products: CashierProductStats[];
  orders: OrderRead[];
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
export type StatInterval = {
  from_time: string;
  to_time: string;
  count: number;
  revenue: number;
};
export type ProductTimeseries = {
  product_id: number;
  product_name: string;
  intervals: StatInterval[];
};
export type ProductOverallStats = {
  product_id: number;
  product_name: string;
  count: number;
  revenue: number;
};
export type ProductStats = {
  from_time: string;
  to_time: string;
  daily_intervals: StatInterval[];
  hourly_intervals: StatInterval[];
  product_hourly_intervals: ProductTimeseries[];
  product_overall_stats: ProductOverallStats[];
  deposit_hourly_intervals: ProductTimeseries[];
  deposit_overall_stats: ProductOverallStats[];
};
export type VoucherStats = {
  vouchers_issued: number;
  vouchers_spent: number;
};
export type TimeseriesStats = {
  from_time: string;
  to_time: string;
  daily_intervals: StatInterval[];
  hourly_intervals: StatInterval[];
};
export type DashboardOverview = {
  total_guest_credit: number;
  total_revenue: number;
  guests_with_orders: number;
  guests_with_credit: number;
  guests_paid_out: number;
  online_donation: number;
  online_for_payout: number;
};
export type CounterRevenue = {
  till_id: number;
  till_name: string;
  revenue: number;
  order_count: number;
};
export type RevenueByCounter = {
  counters: CounterRevenue[];
  total_revenue: number;
};
export type PaymentMethodStats = {
  payment_method: string;
  revenue: number;
  order_count: number;
};
export type PaymentMethodBreakdown = {
  methods: PaymentMethodStats[];
  total_revenue: number;
};
export type HourlyPredictionPoint = {
  hour: number;
  actual_revenue: number | null;
  predicted_revenue: number;
  cumulative_actual: number | null;
  cumulative_predicted: number;
};
export type RevenuePrediction = {
  current_revenue: number;
  predicted_end_of_day: number;
  predicted_event_total: number;
  confidence_level: string;
  hours_of_data: number;
  days_of_data: number;
  events_used: number;
  data_source: string;
  hourly_timeseries: HourlyPredictionPoint[];
  average_daily_revenue: number;
  expected_visitors_per_day: number | null;
  actual_visitors_today: number;
  historical_revenue_per_visitor: number | null;
  visitor_based_prediction: number | null;
};
export type Ticket = {
  name: string;
  price: number;
  tax_rate_id: number;
  restrictions: ProductRestriction[];
  is_locked: boolean;
  initial_top_up_amount: number;
  node_id: number;
  id: number;
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
  price: number;
  tax_rate_id: number;
  restrictions: ProductRestriction[];
  is_locked: boolean;
  initial_top_up_amount: number;
};
export type UserTagSecret = {
  key0: string;
  key1: string;
  description: string;
  id: number;
  node_id: number;
};
export type NewUserTagSecret = {
  key0: string;
  key1: string;
  description: string;
};
export type NewUserTag = {
  pin: string;
  restriction?: ProductRestriction | null;
  secret_id: number;
  uid?: number | null;
  is_vip?: boolean;
  comment?: string | null;
  group_tag?: string | null;
};
export type UserTagAccountAssociation = {
  account_id: number;
  mapping_was_valid_until: string;
};
export type UserTagDetail = {
  id: number;
  pin: string;
  uid: number | null;
  node_id: number;
  comment?: string | null;
  account_id?: number | null;
  user_id?: number | null;
  is_vip?: boolean;
  group_tag?: string | null;
  account_creation_blocked?: boolean;
  account_history: UserTagAccountAssociation[];
};
export type NormalizedListUserTagDetailInt = {
  ids: number[];
  entities: {
    [key: string]: UserTagDetail;
  };
};
export type FindUserTagPayload = {
  search_term: string;
};
export type CreateAccountsResponse = {
  created: number;
  skipped: number;
};
export type CreateAccountsPayload = {
  user_tag_ids?: number[] | null;
};
export type UpdateCommentPayload = {
  comment: string;
};
export type UpdateVipStatusPayload = {
  is_vip: boolean;
};
export type UpdateGroupTagPayload = {
  group_tag: string | null;
};
export type UpdateAccountCreationBlockedPayload = {
  account_creation_blocked: boolean;
};
export type TseType = "diebold_nixdorf";
export type TseStatus = "new" | "active" | "disabled" | "failed";
export type Tse = {
  name: string;
  ws_url: string;
  ws_timeout: number;
  password: string;
  type: TseType;
  serial: string | null;
  node_id: number;
  id: number;
  status: TseStatus;
  hashalgo: string | null;
  time_format: string | null;
  public_key: string | null;
  certificate: string | null;
  process_data_encoding: string | null;
};
export type NormalizedListTseInt = {
  ids: number[];
  entities: {
    [key: string]: Tse;
  };
};
export type NewTse = {
  name: string;
  ws_url: string;
  ws_timeout: number;
  password: string;
  type: TseType;
  serial: string | null;
};
export type UpdateTse = {
  name: string;
  ws_url: string;
  ws_timeout: number;
  password: string;
};
export type PayoutRunWithStats = {
  id: number;
  node_id: number;
  created_by: number | null;
  created_at: string;
  set_done_by: number | null;
  set_done_at: string | null;
  done: boolean;
  revoked: boolean;
  sepa_was_generated: boolean;
  total_donation_amount: number;
  total_payout_amount: number;
  n_payouts: number;
};
export type NormalizedListPayoutRunWithStatsInt = {
  ids: number[];
  entities: {
    [key: string]: PayoutRunWithStats;
  };
};
export type NewPayoutRun = {
  max_payout_sum: number;
  max_num_payouts: number;
};
export type PendingPayoutDetail = {
  total_payout_amount: number;
  total_donation_amount: number;
  n_payouts: number;
};
export type Payout = {
  id: number;
  customer_account_id: number;
  iban: string | null;
  account_name: string | null;
  email: string | null;
  user_tag_id: number;
  user_tag_uid: number;
  amount: number;
  donation: number;
  payout_run_id: number;
};
export type PayoutRead = {
  id: number;
  customer_account_id: number;
  iban: string | null;
  account_name: string | null;
  email: string | null;
  user_tag_id: number;
  user_tag_uid: number;
  amount: number;
  donation: number;
  payout_run_id: number;
  user_tag_uid_hex: string | null;
};
export type CreateSepaXmlPayload = {
  execution_date: string;
};
export type Language = "en-US" | "de-DE";
export type PublicEventSettings = {
  currency_identifier: string;
  max_account_balance: number;
  vip_max_account_balance?: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  expected_visitors_per_day?: number | null;
  post_payment_allowed?: boolean;
  sumup_topup_enabled: boolean;
  sumup_payment_enabled: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_organizer: string | null;
  pretix_event: string | null;
  pretix_ticket_ids: number[] | null;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_max_num_payouts_in_run: number;
  sepa_allowed_country_codes: string[];
  email_enabled: boolean;
  email_default_sender?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  payout_done_subject?: string | null;
  payout_done_message?: string | null;
  payout_registered_subject?: string | null;
  payout_registered_message?: string | null;
  payout_sender?: string | null;
  donation_enabled?: boolean;
  customer_portal_banner_image_url?: string | null;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_background_color?: string | null;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  id: number;
  languages: Language[];
};
export type ObjectType =
  | "user"
  | "product"
  | "ticket"
  | "till"
  | "user_role"
  | "tax_rate"
  | "user_tag"
  | "tse"
  | "account"
  | "terminal"
  | "entry_area"
  | "entry_group";
export type NodeSeenByUser = {
  id: number;
  parent: number;
  name: string;
  description: string;
  read_only: boolean;
  event: PublicEventSettings | null;
  path: string;
  parent_ids: number[];
  event_node_id: number | null;
  parents_until_event_node: number[] | null;
  forbidden_objects_at_node: ObjectType[];
  computed_forbidden_objects_at_node: ObjectType[];
  forbidden_objects_in_subtree: ObjectType[];
  computed_forbidden_objects_in_subtree: ObjectType[];
  children: NodeSeenByUser[];
  privileges_at_node: Privilege[];
};
export type Node = {
  id: number;
  parent: number;
  name: string;
  description: string;
  read_only: boolean;
  event: PublicEventSettings | null;
  path: string;
  parent_ids: number[];
  event_node_id: number | null;
  parents_until_event_node: number[] | null;
  forbidden_objects_at_node: ObjectType[];
  computed_forbidden_objects_at_node: ObjectType[];
  forbidden_objects_in_subtree: ObjectType[];
  computed_forbidden_objects_in_subtree: ObjectType[];
  children: Node[];
};
export type NewNode = {
  name: string;
  description: string;
  forbidden_objects_at_node?: ObjectType[];
  forbidden_objects_in_subtree?: ObjectType[];
};
export type NewEvent = {
  sumup_api_key?: string;
  sumup_affiliate_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  pretix_api_key: string | null;
  email_smtp_password?: string | null;
  wifi_ssid?: string | null;
  wifi_passphrase?: string | null;
  currency_identifier: string;
  max_account_balance: number;
  vip_max_account_balance?: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  expected_visitors_per_day?: number | null;
  post_payment_allowed?: boolean;
  sumup_topup_enabled: boolean;
  sumup_payment_enabled: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_organizer: string | null;
  pretix_event: string | null;
  pretix_ticket_ids: number[] | null;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_max_num_payouts_in_run?: number | null;
  sepa_allowed_country_codes: string[];
  email_enabled: boolean;
  email_default_sender?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  payout_done_subject?: string | null;
  payout_done_message?: string | null;
  payout_registered_subject?: string | null;
  payout_registered_message?: string | null;
  payout_sender?: string | null;
  donation_enabled?: boolean;
  customer_portal_banner_image_url?: string | null;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_background_color?: string | null;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  name: string;
  description: string;
  forbidden_objects_at_node?: ObjectType[];
  forbidden_objects_in_subtree?: ObjectType[];
};
export type CopyEventOptions = {
  copy_event_settings?: boolean;
  copy_user_tags?: boolean;
  copy_account_balances?: boolean;
  copy_tills?: boolean;
  copy_terminals?: boolean;
  copy_users?: boolean;
  copy_products?: boolean;
  copy_tse_devices?: boolean;
  copy_sub_nodes?: boolean;
};
export type CopyEventRequest = {
  name: string;
  description: string;
  options: CopyEventOptions;
};
export type UpdateEvent = {
  sumup_api_key?: string;
  sumup_affiliate_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  pretix_api_key: string | null;
  email_smtp_password?: string | null;
  wifi_ssid?: string | null;
  wifi_passphrase?: string | null;
  currency_identifier: string;
  max_account_balance: number;
  vip_max_account_balance?: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  expected_visitors_per_day?: number | null;
  post_payment_allowed?: boolean;
  sumup_topup_enabled: boolean;
  sumup_payment_enabled: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_organizer: string | null;
  pretix_event: string | null;
  pretix_ticket_ids: number[] | null;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_max_num_payouts_in_run?: number | null;
  sepa_allowed_country_codes: string[];
  email_enabled: boolean;
  email_default_sender?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  payout_done_subject?: string | null;
  payout_done_message?: string | null;
  payout_registered_subject?: string | null;
  payout_registered_message?: string | null;
  payout_sender?: string | null;
  donation_enabled?: boolean;
  customer_portal_banner_image_url?: string | null;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_background_color?: string | null;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
};
export type SumUpConnectionSource = "node_link" | "legacy_event_oauth" | "legacy_event_api_key";
export type ResolvedSumUpLink = {
  source: SumUpConnectionSource;
  source_node_id: number;
  source_node_name: string;
  merchant_code: string;
  merchant_name?: string | null;
  inherited?: boolean;
};
export type RestrictedEventSettings = {
  sumup_api_key?: string;
  sumup_affiliate_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  pretix_api_key: string | null;
  email_smtp_password?: string | null;
  wifi_ssid?: string | null;
  wifi_passphrase?: string | null;
  currency_identifier: string;
  max_account_balance: number;
  vip_max_account_balance?: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  expected_visitors_per_day?: number | null;
  post_payment_allowed?: boolean;
  sumup_topup_enabled: boolean;
  sumup_payment_enabled: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_organizer: string | null;
  pretix_event: string | null;
  pretix_ticket_ids: number[] | null;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_max_num_payouts_in_run: number;
  sepa_allowed_country_codes: string[];
  email_enabled: boolean;
  email_default_sender?: string | null;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  payout_done_subject?: string | null;
  payout_done_message?: string | null;
  payout_registered_subject?: string | null;
  payout_registered_message?: string | null;
  payout_sender?: string | null;
  donation_enabled?: boolean;
  customer_portal_banner_image_url?: string | null;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_background_color?: string | null;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  id: number;
  languages: Language[];
  sumup_oauth_refresh_token: string;
  resolved_sumup_link?: ResolvedSumUpLink | null;
  sumup_global_oauth_configured?: boolean;
  sumup_global_affiliate_key_configured?: boolean;
  sumup_legacy_api_key_configured?: boolean;
  sumup_legacy_oauth_configured?: boolean;
};
export type NodeSumUpConnectionStatus = {
  node_id: number;
  node_name: string;
  connected: boolean;
  merchant_code?: string | null;
  merchant_name?: string | null;
  linked_event_count?: number;
  oauth_client_id?: string;
  oauth_configured?: boolean;
  affiliate_key_configured?: boolean;
};
export type SumUpTokenPayload = {
  authorization_code: string;
  redirect_uri: string;
};
export type BodyUploadEventBannerTreeEventsNodeIdBannerPost = {
  file: Blob;
};
export type SumUpCheckoutStatus = "PENDING" | "FAILED" | "PAID";
export type SumUpTransaction = {
  amount: number;
  currency: string;
  id: string;
  payment_type?: string | null;
  product_summary?: string | null;
  card_type?: string | null;
  type?: string | null;
  status: string;
  timestamp: string;
  transaction_code: string;
};
export type SumUpCheckout = {
  checkout_reference: string;
  amount: number;
  currency: string;
  merchant_code: string;
  description: string;
  redirect_url: string;
  id: string;
  status: SumUpCheckoutStatus;
  valid_until?: string | null;
  date: string;
  transaction_code?: string | null;
  transaction_id?: string | null;
  transactions?: SumUpTransaction[];
};
export type Customer = {
  node_id: number;
  id: number;
  type: AccountType;
  name: string | null;
  comment: string | null;
  balance: number;
  vouchers: number;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  user_tag_comment?: string | null;
  restriction: ProductRestriction | null;
  is_vip?: boolean;
  vip_max_balance?: number | null;
  tag_history: UserTagHistoryEntry[];
  iban: string | null;
  account_name: string | null;
  email: string | null;
  donation: number | null;
  payout_export: boolean | null;
  user_tag_pin: string | null;
  donate_all: boolean;
  has_entered_info: boolean;
  payout: Payout | null;
};
export type CustomerRead = {
  node_id: number;
  id: number;
  type: AccountType;
  name: string | null;
  comment: string | null;
  balance: number;
  vouchers: number;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  user_tag_comment?: string | null;
  restriction: ProductRestriction | null;
  is_vip?: boolean;
  vip_max_balance?: number | null;
  tag_history: UserTagHistoryEntryRead[];
  iban: string | null;
  account_name: string | null;
  email: string | null;
  donation: number | null;
  payout_export: boolean | null;
  user_tag_pin: string | null;
  donate_all: boolean;
  has_entered_info: boolean;
  payout: PayoutRead | null;
  user_tag_uid_hex: string | null;
};
export type FindCustomerPayload = {
  search_term: string;
};
export type UserTagSwapCandidate = {
  user_tag_id: number;
  uid: number | null;
  pin: string;
  comment?: string | null;
  account_id?: number | null;
  account_creation_blocked?: boolean;
  target_mode?: string | null;
  target_reason?: string | null;
};
export type FindTagSwapCandidatesPayload = {
  search_term: string;
  mode: string;
};
export type SwapCustomerTagResponse = {
  customer_account_id: number;
  used_existing_target_account: boolean;
};
export type SwapCustomerTagPayload = {
  source_user_tag_id: number;
  target_user_tag_id: number;
  comment: string;
  block_source_tag?: boolean;
};
export type TerminalMode = "till" | "entry" | "exit";
export type Terminal = {
  name: string;
  description?: string | null;
  mode?: TerminalMode;
  entry_area_id?: number | null;
  self_service?: boolean;
  id: number;
  node_id: number;
  till_id: number | null;
  session_uuid: string | null;
  registration_uuid: string | null;
  active_user_id?: number | null;
  active_user_role_id?: number | null;
};
export type NormalizedListTerminalInt = {
  ids: number[];
  entities: {
    [key: string]: Terminal;
  };
};
export type NewTerminal = {
  name: string;
  description?: string | null;
  mode?: TerminalMode;
  entry_area_id?: number | null;
  self_service?: boolean;
};
export type SwitchTillPayload = {
  new_till_id: number;
};
export type TerminalUserLoginPayload = {
  user_id: number;
  role_id: number;
};
export type HeadwindDeviceMappingWithTerminal = {
  id: number;
  node_id: number;
  terminal_id: number;
  headwind_device_id: string;
  headwind_device_number?: string | null;
  headwind_device_name?: string | null;
  headwind_device_serial?: string | null;
  headwind_device_model?: string | null;
  last_synced_at?: string | null;
  last_token_pushed_at?: string | null;
  last_push_status?: string | null;
  last_push_error?: string | null;
  last_wifi_pushed_at?: string | null;
  last_wifi_push_status?: string | null;
  last_wifi_push_error?: string | null;
  created_at: string;
  updated_at: string;
  terminal_name: string;
  terminal_description?: string | null;
};
export type CreateHeadwindMappingPayload = {
  terminal_id: number;
  headwind_device_id: string;
  headwind_device_number?: string | null;
  headwind_device_name?: string | null;
  headwind_device_serial?: string | null;
  headwind_device_model?: string | null;
};
export type HeadwindDevice = {
  id: number | string;
  deviceNumber?: string | null;
  serial?: string | null;
  imei?: string | null;
  description?: string | null;
  configurationName?: string | null;
  lastUpdate?: number | string | null;
  lastIp?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  [key: string]: any;
};
export type HeadwindDeviceWithMapping = {
  device: HeadwindDevice;
  mapping?: HeadwindDeviceMappingWithTerminal | null;
};
export type ToolDescription = {
  name: string;
  description: string;
  method: "GET" | "POST";
  path: string;
  input_schema?: {
    [key: string]: any;
  } | null;
};
export type CreateNodePayload = {
  /** ID of the parent node below which the child node will be created. */
  parent_node_id: number;
  node: NewNode;
};
export type CreateProductPayload = {
  /** ID of the node/event the product belongs to. */
  node_id: number;
  product: NewProduct;
};
export type CreateCashRegisterPayload = {
  /** ID of the node/event the cash register belongs to. */
  node_id: number;
  cash_register: NewCashRegister;
};
export type CreateTillPayload = {
  /** ID of the node/event the till belongs to. */
  node_id: number;
  till: NewTill;
};
export type CreateTillButtonPayload = {
  /** ID of the node/event the button belongs to. */
  node_id: number;
  button: NewTillButton;
};
export type CreateTillLayoutPayload = {
  /** ID of the node/event the layout belongs to. */
  node_id: number;
  layout: NewTillLayout;
};
export type CreateTillProfilePayload = {
  /** ID of the node/event the till profile belongs to. */
  node_id: number;
  till_profile: NewTillProfile;
};
export type CreateTerminalPayload = {
  /** ID of the node/event the terminal belongs to. */
  node_id: number;
  terminal: NewTerminal;
};
export type CreateTaxRatePayload = {
  /** ID of the node/event the tax rate belongs to. */
  node_id: number;
  tax_rate: NewTaxRate;
};
export type EventSummary = {
  node_id: number;
  node_name: string;
  path: string;
  description: string;
  event_id: number;
  event_name: string;
  start_date?: string | null;
  end_date?: string | null;
};
export type EntryArea = {
  name: string;
  description?: string | null;
  id: number;
  node_id: number;
};
export type NormalizedListEntryAreaInt = {
  ids: number[];
  entities: {
    [key: string]: EntryArea;
  };
};
export type NewEntryArea = {
  name: string;
  description?: string | null;
};
export type EntryAreaGroupWithGroup = {
  id: number;
  area_id: number;
  group_id: number;
  group_name: string;
  group_description?: string | null;
};
export type EntryAreaGroup = {
  id: number;
  area_id: number;
  group_id: number;
};
export type EntryAreaGroupAssignPayload = {
  group_id: number;
};
export type EntryAreaGroupWindow = {
  start_at: string;
  end_at: string;
  id: number;
  area_group_id: number;
};
export type NewEntryAreaGroupWindow = {
  start_at: string;
  end_at: string;
};
export type EntryGroup = {
  name: string;
  description?: string | null;
  id: number;
  node_id: number;
};
export type NormalizedListEntryGroupInt = {
  ids: number[];
  entities: {
    [key: string]: EntryGroup;
  };
};
export type NewEntryGroup = {
  name: string;
  description?: string | null;
};
export type EntryGroupMember = {
  user_tag_id: number;
  user_tag_uid: number | null;
  user_tag_pin: string;
  comment?: string | null;
  is_vip?: boolean;
};
export type EntryGroupMemberAddPayload = {
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
};
export type EntryGroupMemberAddByGroupTagPayload = {
  group_tag: string;
};
export type EntryDirection = "entry" | "exit";
export type EntryScanLog = {
  id: number;
  scanned_at: string;
  node_id: number;
  terminal_id: number;
  terminal_name: string;
  area_id: number;
  area_name: string;
  direction: EntryDirection;
  user_tag_id: number | null;
  user_tag_uid: number;
  allowed: boolean;
  reason: string;
  group_id: number | null;
  group_name: string | null;
};
export const {
  useListProductsQuery,
  useLazyListProductsQuery,
  useCreateProductMutation,
  useGetProductQuery,
  useLazyGetProductQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useListUsersQuery,
  useLazyListUsersQuery,
  useCreateUserMutation,
  useAcceptInvitationMutation,
  useGetUserQuery,
  useLazyGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useInviteUserMutation,
  useListUserRolesQuery,
  useLazyListUserRolesQuery,
  useCreateUserRoleMutation,
  useUpdateUserRoleMutation,
  useDeleteUserRoleMutation,
  useListUserToRoleQuery,
  useLazyListUserToRoleQuery,
  useUpdateUserToRolesMutation,
  useListTaxRatesQuery,
  useLazyListTaxRatesQuery,
  useCreateTaxRateMutation,
  useGetTaxRateQuery,
  useLazyGetTaxRateQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,
  useLoginMutation,
  useChangePasswordMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useLogoutMutation,
  useListTillsQuery,
  useLazyListTillsQuery,
  useCreateTillMutation,
  useGetTillQuery,
  useLazyGetTillQuery,
  useUpdateTillMutation,
  useDeleteTillMutation,
  useRemoveFromTerminalMutation,
  useSwitchTerminalMutation,
  useListTillLayoutsQuery,
  useLazyListTillLayoutsQuery,
  useCreateTillLayoutMutation,
  useGetTillLayoutQuery,
  useLazyGetTillLayoutQuery,
  useUpdateTillLayoutMutation,
  useDeleteTillLayoutMutation,
  useListTillProfilesQuery,
  useLazyListTillProfilesQuery,
  useCreateTillProfileMutation,
  useGetTillProfileQuery,
  useLazyGetTillProfileQuery,
  useUpdateTillProfileMutation,
  useDeleteTillProfileMutation,
  useListTillButtonsQuery,
  useLazyListTillButtonsQuery,
  useCreateTillButtonMutation,
  useGetTillButtonQuery,
  useLazyGetTillButtonQuery,
  useUpdateTillButtonMutation,
  useDeleteTillButtonMutation,
  useListRegisterStockingsQuery,
  useLazyListRegisterStockingsQuery,
  useCreateRegisterStockingMutation,
  useUpdateRegisterStockingMutation,
  useDeleteRegisterStockingMutation,
  useListCashRegistersAdminQuery,
  useLazyListCashRegistersAdminQuery,
  useCreateRegisterMutation,
  useGetCashRegisterAdminQuery,
  useLazyGetCashRegisterAdminQuery,
  useUpdateRegisterMutation,
  useDeleteRegisterMutation,
  useGetCashierShiftsForRegisterQuery,
  useLazyGetCashierShiftsForRegisterQuery,
  useListTransactionsQuery,
  useLazyListTransactionsQuery,
  useTransferRegisterMutation,
  useAssignRegisterMutation,
  useModifyRegisterBalanceMutation,
  useGetPublicConfigQuery,
  useLazyGetPublicConfigQuery,
  useListConfigEntriesQuery,
  useLazyListConfigEntriesQuery,
  useSetConfigEntryMutation,
  useGetGlobalEmailConfigQuery,
  useLazyGetGlobalEmailConfigQuery,
  useUpdateGlobalEmailConfigMutation,
  useGetGlobalSumupConfigQuery,
  useLazyGetGlobalSumupConfigQuery,
  useUpdateGlobalSumupConfigMutation,
  useSendGlobalEmailTestMutation,
  useListSystemAccountsQuery,
  useLazyListSystemAccountsQuery,
  useFindAccountsMutation,
  useGetAccountQuery,
  useLazyGetAccountQuery,
  useDisableAccountMutation,
  useUpdateBalanceMutation,
  useUpdateVoucherAmountMutation,
  useTransferBalanceMutation,
  useUpdateAccountCommentMutation,
  useListOrdersByTillQuery,
  useLazyListOrdersByTillQuery,
  useListOrdersFilteredQuery,
  useLazyListOrdersFilteredQuery,
  useListOrdersQuery,
  useLazyListOrdersQuery,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useCancelOrderMutation,
  useGetOrderBonQuery,
  useLazyGetOrderBonQuery,
  useEditOrderMutation,
  useListCashiersQuery,
  useLazyListCashiersQuery,
  useGetCashierQuery,
  useLazyGetCashierQuery,
  useGetCashierShiftsQuery,
  useLazyGetCashierShiftsQuery,
  useGetCashierShiftStatsQuery,
  useLazyGetCashierShiftStatsQuery,
  useCloseOutCashierMutation,
  useGetProductStatsQuery,
  useLazyGetProductStatsQuery,
  useGetVoucherStatsQuery,
  useLazyGetVoucherStatsQuery,
  useGetEntryStatsQuery,
  useLazyGetEntryStatsQuery,
  useGetTopUpStatsQuery,
  useLazyGetTopUpStatsQuery,
  useGetPayOutStatsQuery,
  useLazyGetPayOutStatsQuery,
  useGetDashboardOverviewQuery,
  useLazyGetDashboardOverviewQuery,
  useGetRevenueByCounterQuery,
  useLazyGetRevenueByCounterQuery,
  useGetPaymentMethodStatsQuery,
  useLazyGetPaymentMethodStatsQuery,
  useGetAvailableDatesQuery,
  useLazyGetAvailableDatesQuery,
  useGetRevenuePredictionQuery,
  useLazyGetRevenuePredictionQuery,
  useListTicketsQuery,
  useLazyListTicketsQuery,
  useCreateTicketMutation,
  useGetTicketQuery,
  useLazyGetTicketQuery,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useCreateUserTagSecretMutation,
  useListUserTagSecretsQuery,
  useLazyListUserTagSecretsQuery,
  useCreateUserTagsMutation,
  useFindUserTagsMutation,
  useCountTagsWithoutAccountsQuery,
  useLazyCountTagsWithoutAccountsQuery,
  useCreateAccountsForUserTagsMutation,
  useGetUserTagDetailQuery,
  useLazyGetUserTagDetailQuery,
  useUpdateUserTagCommentMutation,
  useUpdateUserTagVipStatusMutation,
  useUpdateUserTagGroupTagMutation,
  useUpdateUserTagAccountCreationBlockedMutation,
  useListTsesQuery,
  useLazyListTsesQuery,
  useCreateTseMutation,
  useUpdateTseMutation,
  useListPayoutRunsQuery,
  useLazyListPayoutRunsQuery,
  useCreatePayoutRunMutation,
  usePendingPayoutDetailQuery,
  useLazyPendingPayoutDetailQuery,
  usePayoutRunPayoutsQuery,
  useLazyPayoutRunPayoutsQuery,
  usePayoutRunCsvExportMutation,
  usePayoutRunSepaXmlMutation,
  usePreviousPayoutRunSepaXmlMutation,
  useSetPayoutRunAsDoneMutation,
  useRevokePayoutRunMutation,
  useGetTreeForCurrentUserQuery,
  useLazyGetTreeForCurrentUserQuery,
  useCreateNodeMutation,
  useUpdateNodeMutation,
  useArchiveNodeMutation,
  useCreateEventMutation,
  useCopyEventMutation,
  useUpdateEventMutation,
  useGetRestrictedEventSettingsQuery,
  useLazyGetRestrictedEventSettingsQuery,
  useClearLegacySumupSettingsMutation,
  useDeleteNodeMutation,
  useGenerateTestBonMutation,
  useGenerateTestReportMutation,
  useGenerateRevenueReportMutation,
  useGetNodeSumupLinkStatusQuery,
  useLazyGetNodeSumupLinkStatusQuery,
  useDeleteNodeSumupLinkMutation,
  useConfigureSumupTokenMutation,
  useUploadEventBannerMutation,
  useDeleteEventBannerMutation,
  useGetEventBannerQuery,
  useLazyGetEventBannerQuery,
  useListSumupCheckoutsQuery,
  useLazyListSumupCheckoutsQuery,
  useListSumupTransactionsQuery,
  useLazyListSumupTransactionsQuery,
  useGetSumupCheckoutQuery,
  useLazyGetSumupCheckoutQuery,
  useFindCustomersMutation,
  useFindCustomerTagSwapCandidatesMutation,
  useSwapCustomerTagMutation,
  useGetCustomerQuery,
  useLazyGetCustomerQuery,
  usePreventCustomerPayoutMutation,
  useAllowCustomerPayoutMutation,
  useListTerminalsQuery,
  useLazyListTerminalsQuery,
  useCreateTerminalMutation,
  useGetTerminalQuery,
  useLazyGetTerminalQuery,
  useUpdateTerminalMutation,
  useDeleteTerminalMutation,
  useLogoutTerminalMutation,
  useSwitchTillMutation,
  useForceLogoutUserMutation,
  useLoginUserMutation,
  useGetTransactionQuery,
  useLazyGetTransactionQuery,
  useListMappingsQuery,
  useLazyListMappingsQuery,
  useCreateOrUpdateMappingMutation,
  useListHeadwindDevicesQuery,
  useLazyListHeadwindDevicesQuery,
  useDeleteMappingMutation,
  useRefreshMappingTokenMutation,
  useListLlmToolsQuery,
  useLazyListLlmToolsQuery,
  useListNodesLlmQuery,
  useLazyListNodesLlmQuery,
  useCreateNodeLlmMutation,
  useCreateProductLlmMutation,
  useListProductsLlmQuery,
  useLazyListProductsLlmQuery,
  useCreateCashRegisterLlmMutation,
  useListCashRegistersLlmQuery,
  useLazyListCashRegistersLlmQuery,
  useCreateTillLlmMutation,
  useListTillsLlmQuery,
  useLazyListTillsLlmQuery,
  useCreateTillButtonLlmMutation,
  useListTillButtonsLlmQuery,
  useLazyListTillButtonsLlmQuery,
  useCreateTillLayoutLlmMutation,
  useListTillLayoutsLlmQuery,
  useLazyListTillLayoutsLlmQuery,
  useCreateTillProfileLlmMutation,
  useListTillProfilesLlmQuery,
  useLazyListTillProfilesLlmQuery,
  useCreateTerminalLlmMutation,
  useListTerminalsLlmQuery,
  useLazyListTerminalsLlmQuery,
  useCreateTaxRateLlmMutation,
  useListTaxRatesLlmQuery,
  useLazyListTaxRatesLlmQuery,
  useListEventsLlmQuery,
  useLazyListEventsLlmQuery,
  useListEntryAreasQuery,
  useLazyListEntryAreasQuery,
  useCreateEntryAreaMutation,
  useGetEntryAreaQuery,
  useLazyGetEntryAreaQuery,
  useUpdateEntryAreaMutation,
  useDeleteEntryAreaMutation,
  useListEntryAreaGroupsQuery,
  useLazyListEntryAreaGroupsQuery,
  useAssignEntryGroupToAreaMutation,
  useRemoveEntryGroupFromAreaMutation,
  useListEntryAreaGroupWindowsQuery,
  useLazyListEntryAreaGroupWindowsQuery,
  useCreateEntryAreaGroupWindowMutation,
  useUpdateEntryAreaGroupWindowMutation,
  useDeleteEntryAreaGroupWindowMutation,
  useListEntryGroupsQuery,
  useLazyListEntryGroupsQuery,
  useCreateEntryGroupMutation,
  useGetEntryGroupQuery,
  useLazyGetEntryGroupQuery,
  useUpdateEntryGroupMutation,
  useDeleteEntryGroupMutation,
  useListEntryGroupMembersQuery,
  useLazyListEntryGroupMembersQuery,
  useAddEntryGroupMemberMutation,
  useAddEntryGroupMembersByGroupTagMutation,
  useRemoveEntryGroupMemberMutation,
  useListEntryScanLogsQuery,
  useLazyListEntryScanLogsQuery,
  useExportEntryScanLogsQuery,
  useLazyExportEntryScanLogsQuery,
} = injectedRtkApi;
