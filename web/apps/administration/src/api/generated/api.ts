import { emptySplitApi as api } from "./emptyApi";
export const addTagTypes = [
  "products",
  "users",
  "user-roles",
  "user-to-roles",
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
  "user_tags",
  "tses",
  "payouts",
  "tree",
  "sumup",
  "terminals",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      listProducts: build.query<ListProductsApiResponse, ListProductsApiArg>({
        query: (queryArg) => ({ url: `/products`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["products"],
      }),
      createProduct: build.mutation<CreateProductApiResponse, CreateProductApiArg>({
        query: (queryArg) => ({
          url: `/products`,
          method: "POST",
          body: queryArg.newProduct,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["products"],
      }),
      getProduct: build.query<GetProductApiResponse, GetProductApiArg>({
        query: (queryArg) => ({ url: `/products/${queryArg.productId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["products"],
      }),
      updateProduct: build.mutation<UpdateProductApiResponse, UpdateProductApiArg>({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          method: "POST",
          body: queryArg.newProduct,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["products"],
      }),
      deleteProduct: build.mutation<DeleteProductApiResponse, DeleteProductApiArg>({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["products"],
      }),
      listUsers: build.query<ListUsersApiResponse, ListUsersApiArg>({
        query: (queryArg) => ({ url: `/users`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["users"],
      }),
      createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
        query: (queryArg) => ({
          url: `/users`,
          method: "POST",
          body: queryArg.createUserPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["users"],
      }),
      getUser: build.query<GetUserApiResponse, GetUserApiArg>({
        query: (queryArg) => ({ url: `/users/${queryArg.userId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["users"],
      }),
      updateUser: build.mutation<UpdateUserApiResponse, UpdateUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}`,
          method: "POST",
          body: queryArg.updateUserPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["users"],
      }),
      deleteUser: build.mutation<DeleteUserApiResponse, DeleteUserApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["users"],
      }),
      changeUserPassword: build.mutation<ChangeUserPasswordApiResponse, ChangeUserPasswordApiArg>({
        query: (queryArg) => ({
          url: `/users/${queryArg.userId}/change-password`,
          method: "POST",
          body: queryArg.changeUserPasswordPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["users"],
      }),
      listUserRoles: build.query<ListUserRolesApiResponse, ListUserRolesApiArg>({
        query: (queryArg) => ({ url: `/user-roles`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["user-roles"],
      }),
      createUserRole: build.mutation<CreateUserRoleApiResponse, CreateUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles`,
          method: "POST",
          body: queryArg.newUserRole,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user-roles"],
      }),
      updateUserRole: build.mutation<UpdateUserRoleApiResponse, UpdateUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles/${queryArg.userRoleId}`,
          method: "POST",
          body: queryArg.updateUserRolePrivilegesPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user-roles"],
      }),
      deleteUserRole: build.mutation<DeleteUserRoleApiResponse, DeleteUserRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-roles/${queryArg.userRoleId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user-roles"],
      }),
      listUserToRole: build.query<ListUserToRoleApiResponse, ListUserToRoleApiArg>({
        query: (queryArg) => ({ url: `/user-to-roles`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["user-to-roles"],
      }),
      associatedUserToRole: build.mutation<AssociatedUserToRoleApiResponse, AssociatedUserToRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-to-roles`,
          method: "POST",
          body: queryArg.newUserToRole,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user-to-roles"],
      }),
      deassociatedUserToRole: build.mutation<DeassociatedUserToRoleApiResponse, DeassociatedUserToRoleApiArg>({
        query: (queryArg) => ({
          url: `/user-to-roles`,
          method: "DELETE",
          body: queryArg.newUserToRole,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user-to-roles"],
      }),
      listTaxRates: build.query<ListTaxRatesApiResponse, ListTaxRatesApiArg>({
        query: (queryArg) => ({ url: `/tax-rates`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tax-rates"],
      }),
      createTaxRate: build.mutation<CreateTaxRateApiResponse, CreateTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates`,
          method: "POST",
          body: queryArg.newTaxRate,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tax-rates"],
      }),
      getTaxRate: build.query<GetTaxRateApiResponse, GetTaxRateApiArg>({
        query: (queryArg) => ({ url: `/tax-rates/${queryArg.taxRateId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tax-rates"],
      }),
      updateTaxRate: build.mutation<UpdateTaxRateApiResponse, UpdateTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateId}`,
          method: "POST",
          body: queryArg.newTaxRate,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tax-rates"],
      }),
      deleteTaxRate: build.mutation<DeleteTaxRateApiResponse, DeleteTaxRateApiArg>({
        query: (queryArg) => ({
          url: `/tax-rates/${queryArg.taxRateId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
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
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/auth/logout`, method: "POST" }),
        invalidatesTags: ["auth"],
      }),
      listTills: build.query<ListTillsApiResponse, ListTillsApiArg>({
        query: (queryArg) => ({ url: `/tills`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tills"],
      }),
      createTill: build.mutation<CreateTillApiResponse, CreateTillApiArg>({
        query: (queryArg) => ({
          url: `/tills`,
          method: "POST",
          body: queryArg.newTill,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tills"],
      }),
      getTill: build.query<GetTillApiResponse, GetTillApiArg>({
        query: (queryArg) => ({ url: `/tills/${queryArg.tillId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tills"],
      }),
      updateTill: build.mutation<UpdateTillApiResponse, UpdateTillApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}`,
          method: "POST",
          body: queryArg.newTill,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tills"],
      }),
      deleteTill: build.mutation<DeleteTillApiResponse, DeleteTillApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tills"],
      }),
      forceLogoutUser: build.mutation<ForceLogoutUserApiResponse, ForceLogoutUserApiArg>({
        query: (queryArg) => ({
          url: `/tills/${queryArg.tillId}/force-logout-user`,
          method: "POST",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tills"],
      }),
      listTillLayouts: build.query<ListTillLayoutsApiResponse, ListTillLayoutsApiArg>({
        query: (queryArg) => ({ url: `/till-layouts`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-layouts"],
      }),
      createTillLayout: build.mutation<CreateTillLayoutApiResponse, CreateTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts`,
          method: "POST",
          body: queryArg.newTillLayout,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      getTillLayout: build.query<GetTillLayoutApiResponse, GetTillLayoutApiArg>({
        query: (queryArg) => ({ url: `/till-layouts/${queryArg.layoutId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-layouts"],
      }),
      updateTillLayout: build.mutation<UpdateTillLayoutApiResponse, UpdateTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          method: "POST",
          body: queryArg.newTillLayout,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      deleteTillLayout: build.mutation<DeleteTillLayoutApiResponse, DeleteTillLayoutApiArg>({
        query: (queryArg) => ({
          url: `/till-layouts/${queryArg.layoutId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-layouts"],
      }),
      listTillProfiles: build.query<ListTillProfilesApiResponse, ListTillProfilesApiArg>({
        query: (queryArg) => ({ url: `/till-profiles`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-profiles"],
      }),
      createTillProfile: build.mutation<CreateTillProfileApiResponse, CreateTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles`,
          method: "POST",
          body: queryArg.newTillProfile,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      getTillProfile: build.query<GetTillProfileApiResponse, GetTillProfileApiArg>({
        query: (queryArg) => ({ url: `/till-profiles/${queryArg.profileId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-profiles"],
      }),
      updateTillProfile: build.mutation<UpdateTillProfileApiResponse, UpdateTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          method: "POST",
          body: queryArg.newTillProfile,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      deleteTillProfile: build.mutation<DeleteTillProfileApiResponse, DeleteTillProfileApiArg>({
        query: (queryArg) => ({
          url: `/till-profiles/${queryArg.profileId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-profiles"],
      }),
      listTillButtons: build.query<ListTillButtonsApiResponse, ListTillButtonsApiArg>({
        query: (queryArg) => ({ url: `/till-buttons`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-buttons"],
      }),
      createTillButton: build.mutation<CreateTillButtonApiResponse, CreateTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons`,
          method: "POST",
          body: queryArg.newTillButton,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      getTillButton: build.query<GetTillButtonApiResponse, GetTillButtonApiArg>({
        query: (queryArg) => ({ url: `/till-buttons/${queryArg.buttonId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-buttons"],
      }),
      updateTillButton: build.mutation<UpdateTillButtonApiResponse, UpdateTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          method: "POST",
          body: queryArg.newTillButton,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      deleteTillButton: build.mutation<DeleteTillButtonApiResponse, DeleteTillButtonApiArg>({
        query: (queryArg) => ({
          url: `/till-buttons/${queryArg.buttonId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-buttons"],
      }),
      listRegisterStockings: build.query<ListRegisterStockingsApiResponse, ListRegisterStockingsApiArg>({
        query: (queryArg) => ({ url: `/till-register-stockings`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-register-stockings"],
      }),
      createRegisterStocking: build.mutation<CreateRegisterStockingApiResponse, CreateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      updateRegisterStocking: build.mutation<UpdateRegisterStockingApiResponse, UpdateRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings/${queryArg.stockingId}`,
          method: "POST",
          body: queryArg.newCashRegisterStocking,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      deleteRegisterStocking: build.mutation<DeleteRegisterStockingApiResponse, DeleteRegisterStockingApiArg>({
        query: (queryArg) => ({
          url: `/till-register-stockings/${queryArg.stockingId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-register-stockings"],
      }),
      listCashRegistersAdmin: build.query<ListCashRegistersAdminApiResponse, ListCashRegistersAdminApiArg>({
        query: (queryArg) => ({ url: `/till-registers`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["till-registers"],
      }),
      createRegister: build.mutation<CreateRegisterApiResponse, CreateRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers`,
          method: "POST",
          body: queryArg.newCashRegister,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-registers"],
      }),
      transferRegister: build.mutation<TransferRegisterApiResponse, TransferRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/transfer-register`,
          method: "POST",
          body: queryArg.transferRegisterPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-registers"],
      }),
      updateRegister: build.mutation<UpdateRegisterApiResponse, UpdateRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          method: "POST",
          body: queryArg.newCashRegister,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["till-registers"],
      }),
      deleteRegister: build.mutation<DeleteRegisterApiResponse, DeleteRegisterApiArg>({
        query: (queryArg) => ({
          url: `/till-registers/${queryArg.registerId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
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
      listSystemAccounts: build.query<ListSystemAccountsApiResponse, ListSystemAccountsApiArg>({
        query: (queryArg) => ({ url: `/system-accounts`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["accounts"],
      }),
      findAccounts: build.mutation<FindAccountsApiResponse, FindAccountsApiArg>({
        query: (queryArg) => ({
          url: `/accounts/find-accounts`,
          method: "POST",
          body: queryArg.findAccountPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      getAccount: build.query<GetAccountApiResponse, GetAccountApiArg>({
        query: (queryArg) => ({ url: `/accounts/${queryArg.accountId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["accounts"],
      }),
      disableAccount: build.mutation<DisableAccountApiResponse, DisableAccountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/disable`,
          method: "POST",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateBalance: build.mutation<UpdateBalanceApiResponse, UpdateBalanceApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-balance`,
          method: "POST",
          body: queryArg.updateBalancePayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateVoucherAmount: build.mutation<UpdateVoucherAmountApiResponse, UpdateVoucherAmountApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-voucher-amount`,
          method: "POST",
          body: queryArg.updateVoucherAmountPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      updateAccountComment: build.mutation<UpdateAccountCommentApiResponse, UpdateAccountCommentApiArg>({
        query: (queryArg) => ({
          url: `/accounts/${queryArg.accountId}/update-comment`,
          method: "POST",
          body: queryArg.updateAccountCommentPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      listOrdersByTill: build.query<ListOrdersByTillApiResponse, ListOrdersByTillApiArg>({
        query: (queryArg) => ({ url: `/orders/by-till/${queryArg.tillId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["orders"],
      }),
      listOrders: build.query<ListOrdersApiResponse, ListOrdersApiArg>({
        query: (queryArg) => ({
          url: `/orders`,
          params: { customer_account_id: queryArg.customerAccountId, node_id: queryArg.nodeId },
        }),
        providesTags: ["orders"],
      }),
      getOrder: build.query<GetOrderApiResponse, GetOrderApiArg>({
        query: (queryArg) => ({ url: `/orders/${queryArg.orderId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["orders"],
      }),
      cancelOrder: build.mutation<CancelOrderApiResponse, CancelOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["orders"],
      }),
      editOrder: build.mutation<EditOrderApiResponse, EditOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}/edit`,
          method: "POST",
          body: queryArg.editSaleProducts,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["orders"],
      }),
      listCashiers: build.query<ListCashiersApiResponse, ListCashiersApiArg>({
        query: (queryArg) => ({ url: `/cashiers`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["cashiers"],
      }),
      getCashier: build.query<GetCashierApiResponse, GetCashierApiArg>({
        query: (queryArg) => ({ url: `/cashiers/${queryArg.cashierId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["cashiers"],
      }),
      getCashierShifts: build.query<GetCashierShiftsApiResponse, GetCashierShiftsApiArg>({
        query: (queryArg) => ({ url: `/cashiers/${queryArg.cashierId}/shifts`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["cashiers"],
      }),
      getCashierShiftStats: build.query<GetCashierShiftStatsApiResponse, GetCashierShiftStatsApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/shift-stats`,
          params: { shift_id: queryArg.shiftId, node_id: queryArg.nodeId },
        }),
        providesTags: ["cashiers"],
      }),
      closeOutCashier: build.mutation<CloseOutCashierApiResponse, CloseOutCashierApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/close-out`,
          method: "POST",
          body: queryArg.closeOut,
          params: { node_id: queryArg.nodeId },
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
          },
        }),
        providesTags: ["stats"],
      }),
      listTickets: build.query<ListTicketsApiResponse, ListTicketsApiArg>({
        query: (queryArg) => ({ url: `/tickets`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tickets"],
      }),
      createTicket: build.mutation<CreateTicketApiResponse, CreateTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets`,
          method: "POST",
          body: queryArg.newTicket,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tickets"],
      }),
      getTicket: build.query<GetTicketApiResponse, GetTicketApiArg>({
        query: (queryArg) => ({ url: `/tickets/${queryArg.ticketId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tickets"],
      }),
      updateTicket: build.mutation<UpdateTicketApiResponse, UpdateTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets/${queryArg.ticketId}`,
          method: "POST",
          body: queryArg.newTicket,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tickets"],
      }),
      deleteTicket: build.mutation<DeleteTicketApiResponse, DeleteTicketApiArg>({
        query: (queryArg) => ({
          url: `/tickets/${queryArg.ticketId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tickets"],
      }),
      findUserTags: build.mutation<FindUserTagsApiResponse, FindUserTagsApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/find-user-tags`,
          method: "POST",
          body: queryArg.findUserTagPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user_tags"],
      }),
      getUserTagDetail: build.query<GetUserTagDetailApiResponse, GetUserTagDetailApiArg>({
        query: (queryArg) => ({ url: `/user-tags/${queryArg.userTagId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["user_tags"],
      }),
      updateUserTagComment: build.mutation<UpdateUserTagCommentApiResponse, UpdateUserTagCommentApiArg>({
        query: (queryArg) => ({
          url: `/user-tags/${queryArg.userTagId}/update-comment`,
          method: "POST",
          body: queryArg.updateCommentPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["user_tags"],
      }),
      listTses: build.query<ListTsesApiResponse, ListTsesApiArg>({
        query: (queryArg) => ({ url: `/tses/`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["tses"],
      }),
      createTse: build.mutation<CreateTseApiResponse, CreateTseApiArg>({
        query: (queryArg) => ({
          url: `/tses/`,
          method: "POST",
          body: queryArg.newTse,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tses"],
      }),
      updateTse: build.mutation<UpdateTseApiResponse, UpdateTseApiArg>({
        query: (queryArg) => ({
          url: `/tses/${queryArg.tseId}`,
          method: "POST",
          body: queryArg.updateTse,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["tses"],
      }),
      listPayoutRuns: build.query<ListPayoutRunsApiResponse, ListPayoutRunsApiArg>({
        query: (queryArg) => ({ url: `/payouts/`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["payouts"],
      }),
      createPayoutRun: build.mutation<CreatePayoutRunApiResponse, CreatePayoutRunApiArg>({
        query: (queryArg) => ({
          url: `/payouts/`,
          method: "POST",
          body: queryArg.newPayoutRun,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["payouts"],
      }),
      pendingPayoutDetail: build.query<PendingPayoutDetailApiResponse, PendingPayoutDetailApiArg>({
        query: (queryArg) => ({ url: `/payouts/pending-payout-detail`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["payouts"],
      }),
      payoutRunPayouts: build.query<PayoutRunPayoutsApiResponse, PayoutRunPayoutsApiArg>({
        query: (queryArg) => ({ url: `/payouts/${queryArg.payoutRunId}/csv`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["payouts"],
      }),
      payoutRunCsvExport: build.mutation<PayoutRunCsvExportApiResponse, PayoutRunCsvExportApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/csv`,
          method: "POST",
          body: queryArg.createCsvPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["payouts"],
      }),
      payoutRunSepaXmlExport: build.mutation<PayoutRunSepaXmlExportApiResponse, PayoutRunSepaXmlExportApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/sepa_xml`,
          method: "POST",
          body: queryArg.createSepaXmlPayload,
          params: { node_id: queryArg.nodeId },
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
      createEvent: build.mutation<CreateEventApiResponse, CreateEventApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/create-event`,
          method: "POST",
          body: queryArg.newEvent,
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
      generateTestBon: build.mutation<GenerateTestBonApiResponse, GenerateTestBonApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/generate-test-bon`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      listSumupCheckouts: build.query<ListSumupCheckoutsApiResponse, ListSumupCheckoutsApiArg>({
        query: (queryArg) => ({ url: `/sumup/checkouts`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["sumup"],
      }),
      listSumupTransactions: build.query<ListSumupTransactionsApiResponse, ListSumupTransactionsApiArg>({
        query: (queryArg) => ({ url: `/sumup/transactions`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["sumup"],
      }),
      getSumupCheckout: build.query<GetSumupCheckoutApiResponse, GetSumupCheckoutApiArg>({
        query: (queryArg) => ({ url: `/sumup/checkouts/${queryArg.checkoutId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["sumup"],
      }),
      findCustomers: build.mutation<FindCustomersApiResponse, FindCustomersApiArg>({
        query: (queryArg) => ({
          url: `/customers/find-customers`,
          method: "POST",
          body: queryArg.findCustomerPayload,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["accounts"],
      }),
      getCustomer: build.query<GetCustomerApiResponse, GetCustomerApiArg>({
        query: (queryArg) => ({ url: `/customers/${queryArg.customerId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["accounts"],
      }),
      listTerminals: build.query<ListTerminalsApiResponse, ListTerminalsApiArg>({
        query: (queryArg) => ({ url: `/terminal`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["terminals"],
      }),
      createTerminal: build.mutation<CreateTerminalApiResponse, CreateTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal`,
          method: "POST",
          body: queryArg.newTerminal,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["terminals"],
      }),
      getTerminal: build.query<GetTerminalApiResponse, GetTerminalApiArg>({
        query: (queryArg) => ({ url: `/terminal/${queryArg.terminalId}`, params: { node_id: queryArg.nodeId } }),
        providesTags: ["terminals"],
      }),
      updateTerminal: build.mutation<UpdateTerminalApiResponse, UpdateTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}`,
          method: "POST",
          body: queryArg.newTerminal,
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["terminals"],
      }),
      deleteTerminal: build.mutation<DeleteTerminalApiResponse, DeleteTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}`,
          method: "DELETE",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["terminals"],
      }),
      logoutTerminal: build.mutation<LogoutTerminalApiResponse, LogoutTerminalApiArg>({
        query: (queryArg) => ({
          url: `/terminal/${queryArg.terminalId}/logout`,
          method: "POST",
          params: { node_id: queryArg.nodeId },
        }),
        invalidatesTags: ["terminals"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type ListProductsApiResponse = /** status 200 Successful Response */ NormalizedListProductInt;
export type ListProductsApiArg = {
  nodeId?: number | null;
};
export type CreateProductApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductApiArg = {
  nodeId?: number | null;
  newProduct: NewProduct;
};
export type GetProductApiResponse = /** status 200 Successful Response */ Product;
export type GetProductApiArg = {
  productId: number;
  nodeId?: number | null;
};
export type UpdateProductApiResponse = /** status 200 Successful Response */ Product;
export type UpdateProductApiArg = {
  productId: number;
  nodeId?: number | null;
  newProduct: NewProduct;
};
export type DeleteProductApiResponse = /** status 200 Successful Response */ any;
export type DeleteProductApiArg = {
  productId: number;
  nodeId?: number | null;
};
export type ListUsersApiResponse = /** status 200 Successful Response */ NormalizedListUserInt;
export type ListUsersApiArg = {
  nodeId: number;
};
export type CreateUserApiResponse = /** status 200 Successful Response */ User;
export type CreateUserApiArg = {
  nodeId: number;
  createUserPayload: CreateUserPayload;
};
export type GetUserApiResponse = /** status 200 Successful Response */ User;
export type GetUserApiArg = {
  userId: number;
  nodeId: number;
};
export type UpdateUserApiResponse = /** status 200 Successful Response */ User;
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
export type ChangeUserPasswordApiResponse = /** status 200 Successful Response */ User;
export type ChangeUserPasswordApiArg = {
  userId: number;
  nodeId: number;
  changeUserPasswordPayload: ChangeUserPasswordPayload;
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
export type ListUserToRoleApiResponse = /** status 200 Successful Response */ UserToRole[];
export type ListUserToRoleApiArg = {
  nodeId: number;
};
export type AssociatedUserToRoleApiResponse = /** status 200 Successful Response */ UserToRole;
export type AssociatedUserToRoleApiArg = {
  nodeId: number;
  newUserToRole: NewUserToRole;
};
export type DeassociatedUserToRoleApiResponse = /** status 200 Successful Response */ any;
export type DeassociatedUserToRoleApiArg = {
  nodeId: number;
  newUserToRole: NewUserToRole;
};
export type ListTaxRatesApiResponse = /** status 200 Successful Response */ NormalizedListTaxRateInt;
export type ListTaxRatesApiArg = {
  nodeId?: number | null;
};
export type CreateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type CreateTaxRateApiArg = {
  nodeId?: number | null;
  newTaxRate: NewTaxRate;
};
export type GetTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type GetTaxRateApiArg = {
  taxRateId: number;
  nodeId?: number | null;
};
export type UpdateTaxRateApiResponse = /** status 200 Successful Response */ TaxRate;
export type UpdateTaxRateApiArg = {
  taxRateId: number;
  nodeId?: number | null;
  newTaxRate: NewTaxRate;
};
export type DeleteTaxRateApiResponse = /** status 200 Successful Response */ any;
export type DeleteTaxRateApiArg = {
  taxRateId: number;
  nodeId?: number | null;
};
export type LoginApiResponse = /** status 200 Successful Response */ UserLoginResult;
export type LoginApiArg = {
  loginPayload: LoginPayload;
};
export type ChangePasswordApiResponse = /** status 200 Successful Response */ any;
export type ChangePasswordApiArg = {
  changePasswordPayload: ChangePasswordPayload;
};
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type ListTillsApiResponse = /** status 200 Successful Response */ NormalizedListTillInt;
export type ListTillsApiArg = {
  nodeId?: number | null;
};
export type CreateTillApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillApiArg = {
  nodeId?: number | null;
  newTill: NewTill;
};
export type GetTillApiResponse = /** status 200 Successful Response */ Till;
export type GetTillApiArg = {
  tillId: number;
  nodeId?: number | null;
};
export type UpdateTillApiResponse = /** status 200 Successful Response */ Till;
export type UpdateTillApiArg = {
  tillId: number;
  nodeId?: number | null;
  newTill: NewTill;
};
export type DeleteTillApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillApiArg = {
  tillId: number;
  nodeId?: number | null;
};
export type ForceLogoutUserApiResponse = /** status 200 Successful Response */ any;
export type ForceLogoutUserApiArg = {
  tillId: number;
  nodeId?: number | null;
};
export type ListTillLayoutsApiResponse = /** status 200 Successful Response */ NormalizedListTillLayoutInt;
export type ListTillLayoutsApiArg = {
  nodeId?: number | null;
};
export type CreateTillLayoutApiResponse = /** status 200 Successful Response */ NewTillLayout;
export type CreateTillLayoutApiArg = {
  nodeId?: number | null;
  newTillLayout: NewTillLayout;
};
export type GetTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type GetTillLayoutApiArg = {
  layoutId: number;
  nodeId?: number | null;
};
export type UpdateTillLayoutApiResponse = /** status 200 Successful Response */ TillLayout;
export type UpdateTillLayoutApiArg = {
  layoutId: number;
  nodeId?: number | null;
  newTillLayout: NewTillLayout;
};
export type DeleteTillLayoutApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillLayoutApiArg = {
  layoutId: number;
  nodeId?: number | null;
};
export type ListTillProfilesApiResponse = /** status 200 Successful Response */ NormalizedListTillProfileInt;
export type ListTillProfilesApiArg = {
  nodeId?: number | null;
};
export type CreateTillProfileApiResponse = /** status 200 Successful Response */ NewTillProfile;
export type CreateTillProfileApiArg = {
  nodeId?: number | null;
  newTillProfile: NewTillProfile;
};
export type GetTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type GetTillProfileApiArg = {
  profileId: number;
  nodeId?: number | null;
};
export type UpdateTillProfileApiResponse = /** status 200 Successful Response */ TillProfile;
export type UpdateTillProfileApiArg = {
  profileId: number;
  nodeId?: number | null;
  newTillProfile: NewTillProfile;
};
export type DeleteTillProfileApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillProfileApiArg = {
  profileId: number;
  nodeId?: number | null;
};
export type ListTillButtonsApiResponse = /** status 200 Successful Response */ NormalizedListTillButtonInt;
export type ListTillButtonsApiArg = {
  nodeId?: number | null;
};
export type CreateTillButtonApiResponse = /** status 200 Successful Response */ NewTillButton;
export type CreateTillButtonApiArg = {
  nodeId?: number | null;
  newTillButton: NewTillButton;
};
export type GetTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type GetTillButtonApiArg = {
  buttonId: number;
  nodeId?: number | null;
};
export type UpdateTillButtonApiResponse = /** status 200 Successful Response */ TillButton;
export type UpdateTillButtonApiArg = {
  buttonId: number;
  nodeId?: number | null;
  newTillButton: NewTillButton;
};
export type DeleteTillButtonApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillButtonApiArg = {
  buttonId: number;
  nodeId?: number | null;
};
export type ListRegisterStockingsApiResponse =
  /** status 200 Successful Response */ NormalizedListCashRegisterStockingInt;
export type ListRegisterStockingsApiArg = {
  nodeId?: number | null;
};
export type CreateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type CreateRegisterStockingApiArg = {
  nodeId?: number | null;
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type UpdateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type UpdateRegisterStockingApiArg = {
  stockingId: number;
  nodeId?: number | null;
  newCashRegisterStocking: NewCashRegisterStocking;
};
export type DeleteRegisterStockingApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterStockingApiArg = {
  stockingId: number;
  nodeId?: number | null;
};
export type ListCashRegistersAdminApiResponse = /** status 200 Successful Response */ NormalizedListCashRegisterInt;
export type ListCashRegistersAdminApiArg = {
  nodeId?: number | null;
};
export type CreateRegisterApiResponse = /** status 200 Successful Response */ CashRegister;
export type CreateRegisterApiArg = {
  nodeId?: number | null;
  newCashRegister: NewCashRegister;
};
export type TransferRegisterApiResponse = /** status 200 Successful Response */ any;
export type TransferRegisterApiArg = {
  nodeId?: number | null;
  transferRegisterPayload: TransferRegisterPayload;
};
export type UpdateRegisterApiResponse = /** status 200 Successful Response */ any;
export type UpdateRegisterApiArg = {
  registerId: number;
  nodeId?: number | null;
  newCashRegister: NewCashRegister;
};
export type DeleteRegisterApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterApiArg = {
  registerId: number;
  nodeId?: number | null;
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
export type ListSystemAccountsApiArg = {
  nodeId?: number | null;
};
export type FindAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type FindAccountsApiArg = {
  nodeId?: number | null;
  findAccountPayload: FindAccountPayload;
};
export type GetAccountApiResponse = /** status 200 Successful Response */ AccountRead;
export type GetAccountApiArg = {
  accountId: number;
  nodeId?: number | null;
};
export type DisableAccountApiResponse = /** status 200 Successful Response */ any;
export type DisableAccountApiArg = {
  accountId: number;
  nodeId?: number | null;
};
export type UpdateBalanceApiResponse = /** status 200 Successful Response */ any;
export type UpdateBalanceApiArg = {
  accountId: number;
  nodeId?: number | null;
  updateBalancePayload: UpdateBalancePayload;
};
export type UpdateVoucherAmountApiResponse = /** status 200 Successful Response */ any;
export type UpdateVoucherAmountApiArg = {
  accountId: number;
  nodeId?: number | null;
  updateVoucherAmountPayload: UpdateVoucherAmountPayload;
};
export type UpdateAccountCommentApiResponse = /** status 200 Successful Response */ AccountRead;
export type UpdateAccountCommentApiArg = {
  accountId: number;
  nodeId?: number | null;
  updateAccountCommentPayload: UpdateAccountCommentPayload;
};
export type ListOrdersByTillApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersByTillApiArg = {
  tillId: number;
  nodeId?: number | null;
};
export type ListOrdersApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersApiArg = {
  customerAccountId?: number | null;
  nodeId?: number | null;
};
export type GetOrderApiResponse = /** status 200 Successful Response */ OrderRead;
export type GetOrderApiArg = {
  orderId: number;
  nodeId?: number | null;
};
export type CancelOrderApiResponse = /** status 200 Successful Response */ any;
export type CancelOrderApiArg = {
  orderId: number;
  nodeId?: number | null;
};
export type EditOrderApiResponse = /** status 200 Successful Response */ CompletedSaleProductsRead;
export type EditOrderApiArg = {
  orderId: number;
  nodeId?: number | null;
  editSaleProducts: EditSaleProducts;
};
export type ListCashiersApiResponse = /** status 200 Successful Response */ NormalizedListCashierInt;
export type ListCashiersApiArg = {
  nodeId?: number | null;
};
export type GetCashierApiResponse = /** status 200 Successful Response */ CashierRead;
export type GetCashierApiArg = {
  cashierId: number;
  nodeId?: number | null;
};
export type GetCashierShiftsApiResponse = /** status 200 Successful Response */ NormalizedListCashierShiftInt;
export type GetCashierShiftsApiArg = {
  cashierId: number;
  nodeId?: number | null;
};
export type GetCashierShiftStatsApiResponse = /** status 200 Successful Response */ CashierShiftStats;
export type GetCashierShiftStatsApiArg = {
  cashierId: number;
  shiftId?: number | null;
  nodeId?: number | null;
};
export type CloseOutCashierApiResponse = /** status 200 Successful Response */ CloseOutResult;
export type CloseOutCashierApiArg = {
  cashierId: number;
  nodeId?: number | null;
  closeOut: CloseOut;
};
export type GetProductStatsApiResponse = /** status 200 Successful Response */ ProductStats;
export type GetProductStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type GetVoucherStatsApiResponse = /** status 200 Successful Response */ VoucherStats;
export type GetVoucherStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type GetEntryStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetEntryStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type GetTopUpStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetTopUpStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type ListTicketsApiResponse = /** status 200 Successful Response */ NormalizedListTicketInt;
export type ListTicketsApiArg = {
  nodeId?: number | null;
};
export type CreateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type CreateTicketApiArg = {
  nodeId?: number | null;
  newTicket: NewTicket;
};
export type GetTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type GetTicketApiArg = {
  ticketId: number;
  nodeId?: number | null;
};
export type UpdateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type UpdateTicketApiArg = {
  ticketId: number;
  nodeId?: number | null;
  newTicket: NewTicket;
};
export type DeleteTicketApiResponse = /** status 200 Successful Response */ any;
export type DeleteTicketApiArg = {
  ticketId: number;
  nodeId?: number | null;
};
export type FindUserTagsApiResponse = /** status 200 Successful Response */ NormalizedListUserTagDetailInt;
export type FindUserTagsApiArg = {
  nodeId?: number | null;
  findUserTagPayload: FindUserTagPayload;
};
export type GetUserTagDetailApiResponse = /** status 200 Successful Response */ UserTagDetailRead;
export type GetUserTagDetailApiArg = {
  userTagId: number;
  nodeId?: number | null;
};
export type UpdateUserTagCommentApiResponse = /** status 200 Successful Response */ UserTagDetailRead;
export type UpdateUserTagCommentApiArg = {
  userTagId: number;
  nodeId?: number | null;
  updateCommentPayload: UpdateCommentPayload;
};
export type ListTsesApiResponse = /** status 200 Successful Response */ NormalizedListTseInt;
export type ListTsesApiArg = {
  nodeId?: number | null;
};
export type CreateTseApiResponse = /** status 200 Successful Response */ Tse;
export type CreateTseApiArg = {
  nodeId?: number | null;
  newTse: NewTse;
};
export type UpdateTseApiResponse = /** status 200 Successful Response */ Tse;
export type UpdateTseApiArg = {
  tseId: number;
  nodeId?: number | null;
  updateTse: UpdateTse;
};
export type ListPayoutRunsApiResponse = /** status 200 Successful Response */ NormalizedListPayoutRunWithStatsInt;
export type ListPayoutRunsApiArg = {
  nodeId?: number | null;
};
export type CreatePayoutRunApiResponse = /** status 200 Successful Response */ PayoutRunWithStats;
export type CreatePayoutRunApiArg = {
  nodeId?: number | null;
  newPayoutRun: NewPayoutRun;
};
export type PendingPayoutDetailApiResponse = /** status 200 Successful Response */ PendingPayoutDetail;
export type PendingPayoutDetailApiArg = {
  nodeId?: number | null;
};
export type PayoutRunPayoutsApiResponse = /** status 200 Successful Response */ PayoutRead[];
export type PayoutRunPayoutsApiArg = {
  payoutRunId: number;
  nodeId?: number | null;
};
export type PayoutRunCsvExportApiResponse = /** status 200 Successful Response */ string[];
export type PayoutRunCsvExportApiArg = {
  payoutRunId: number;
  nodeId?: number | null;
  createCsvPayload: CreateCsvPayload;
};
export type PayoutRunSepaXmlExportApiResponse = /** status 200 Successful Response */ string[];
export type PayoutRunSepaXmlExportApiArg = {
  payoutRunId: number;
  nodeId?: number | null;
  createSepaXmlPayload: CreateSepaXmlPayload;
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
export type CreateEventApiResponse = /** status 200 Successful Response */ Node;
export type CreateEventApiArg = {
  nodeId: number;
  newEvent: NewEvent;
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
export type GenerateTestBonApiResponse = /** status 200 Successful Response */ any;
export type GenerateTestBonApiArg = {
  nodeId: number;
};
export type ListSumupCheckoutsApiResponse = /** status 200 Successful Response */ SumUpCheckout[];
export type ListSumupCheckoutsApiArg = {
  nodeId: number;
};
export type ListSumupTransactionsApiResponse = /** status 200 Successful Response */ SumUpTransaction[];
export type ListSumupTransactionsApiArg = {
  nodeId: number;
};
export type GetSumupCheckoutApiResponse = /** status 200 Successful Response */ SumUpCheckout;
export type GetSumupCheckoutApiArg = {
  checkoutId: string;
  nodeId: number;
};
export type FindCustomersApiResponse = /** status 200 Successful Response */ CustomerRead[];
export type FindCustomersApiArg = {
  nodeId?: number | null;
  findCustomerPayload: FindCustomerPayload;
};
export type GetCustomerApiResponse = /** status 200 Successful Response */ CustomerRead;
export type GetCustomerApiArg = {
  customerId: number;
  nodeId?: number | null;
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
  node_id: number;
  user_tag_id?: number | null;
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
  id: number;
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
  description?: string | null;
  user_tag_pin?: string | null;
  password?: string | null;
};
export type UpdateUserPayload = {
  login: string;
  display_name: string;
  description?: string | null;
  user_tag_pin?: string | null;
};
export type ChangeUserPasswordPayload = {
  new_password: string;
};
export type Privilege =
  | "node_administration"
  | "customer_management"
  | "create_user"
  | "allow_privileged_role_assignment"
  | "user_management"
  | "cash_transport"
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
export type UserToRole = {
  user_id: number;
  role_id: number;
  node_id: number;
};
export type NewUserToRole = {
  user_id: number;
  role_id: number;
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
  transport_account_id?: number | null;
  cashier_account_id?: number | null;
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
  node_id: number | null;
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
  terminal_id?: number | null;
  node_id: number;
  id: number;
  z_nr: number;
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
  terminal_id?: number | null;
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
  | "cashier"
  | "voucher_create";
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
export type UpdateAccountCommentPayload = {
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
  customer_account_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_id: number | null;
  line_items: LineItemRead[];
  customer_tag_uid_hex: string | null;
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
  customer_account_id: number;
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
  customer_account_id: number;
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
  cashier_account_id: number;
  cash_register_id?: number | null;
  cash_drawer_balance: number;
  till_ids: number[];
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
  cashier_account_id: number;
  cash_register_id?: number | null;
  cash_drawer_balance: number;
  till_ids: number[];
  user_tag_uid_hex: string | null;
};
export type NormalizedListCashierInt = {
  ids: number[];
  entities: {
    [key: string]: CashierRead;
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
export type CashierProductStats = {
  product: Product;
  quantity: number;
};
export type CashierShiftStats = {
  booked_products: CashierProductStats[];
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
  intervals: StatInterval[];
};
export type ProductStats = {
  from_time: string;
  to_time: string;
  daily_intervals: StatInterval[];
  hourly_intervals: StatInterval[];
  product_daily_intervals: ProductTimeseries[];
  product_hourly_intervals: ProductTimeseries[];
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
  account_history: UserTagAccountAssociation[];
};
export type UserTagDetailRead = {
  id: number;
  pin: string;
  uid: number | null;
  node_id: number;
  comment?: string | null;
  account_id?: number | null;
  account_history: UserTagAccountAssociation[];
  uid_hex: string | null;
};
export type NormalizedListUserTagDetailInt = {
  ids: number[];
  entities: {
    [key: string]: UserTagDetailRead;
  };
};
export type FindUserTagPayload = {
  search_term: string;
};
export type UpdateCommentPayload = {
  comment: string;
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
  created_by: string;
  created_at: string;
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
};
export type PendingPayoutDetail = {
  total_payout_amount: number;
  total_donation_amount: number;
  n_payouts: number;
};
export type Payout = {
  customer_account_id: number;
  iban: string;
  account_name: string;
  email: string;
  user_tag_id: number;
  user_tag_uid: number;
  balance: number;
  payout_run_id: number;
};
export type PayoutRead = {
  customer_account_id: number;
  iban: string;
  account_name: string;
  email: string;
  user_tag_id: number;
  user_tag_uid: number;
  balance: number;
  payout_run_id: number;
  user_tag_uid_hex: string | null;
};
export type CreateCsvPayload = {
  batch_size?: number | null;
};
export type CreateSepaXmlPayload = {
  execution_date: string;
  batch_size?: number | null;
};
export type Language = "en-US" | "de-DE";
export type PublicEventSettings = {
  currency_identifier: string;
  max_account_balance: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  sumup_topup_enabled?: boolean;
  sumup_payment_enabled?: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_allowed_country_codes: string[];
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
  | "terminal";
export type NodeSeenByUser = {
  id: number;
  parent: number;
  name: string;
  description: string;
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
  currency_identifier: string;
  max_account_balance: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  sumup_topup_enabled?: boolean;
  sumup_payment_enabled?: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_allowed_country_codes: string[];
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
export type UpdateEvent = {
  sumup_api_key?: string;
  sumup_affiliate_key?: string;
  sumup_merchant_code?: string;
  currency_identifier: string;
  max_account_balance: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  sumup_topup_enabled?: boolean;
  sumup_payment_enabled?: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_allowed_country_codes: string[];
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
};
export type RestrictedEventSettings = {
  sumup_api_key?: string;
  sumup_affiliate_key?: string;
  sumup_merchant_code?: string;
  currency_identifier: string;
  max_account_balance: number;
  start_date?: string | null;
  end_date?: string | null;
  daily_end_time?: string | null;
  sumup_topup_enabled?: boolean;
  sumup_payment_enabled?: boolean;
  customer_portal_url: string;
  customer_portal_about_page_url: string;
  customer_portal_data_privacy_url: string;
  customer_portal_contact_email: string;
  ust_id: string;
  bon_issuer: string;
  bon_address: string;
  bon_title: string;
  sepa_enabled: boolean;
  sepa_sender_name: string;
  sepa_sender_iban: string;
  sepa_description: string;
  sepa_allowed_country_codes: string[];
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  id: number;
  languages: Language[];
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
  tag_history: UserTagHistoryEntry[];
  iban: string | null;
  account_name: string | null;
  email: string | null;
  donation: number | null;
  payout_error: string | null;
  payout_run_id: number | null;
  payout_export: boolean | null;
  user_tag_pin: string | null;
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
  tag_history: UserTagHistoryEntryRead[];
  iban: string | null;
  account_name: string | null;
  email: string | null;
  donation: number | null;
  payout_error: string | null;
  payout_run_id: number | null;
  payout_export: boolean | null;
  user_tag_pin: string | null;
  user_tag_uid_hex: string | null;
};
export type FindCustomerPayload = {
  search_term: string;
};
export type Terminal = {
  name: string;
  description?: string | null;
  id: number;
  node_id: number;
  till_id: number | null;
  session_uuid: string | null;
  registration_uuid: string | null;
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
  useGetUserQuery,
  useLazyGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useListUserRolesQuery,
  useLazyListUserRolesQuery,
  useCreateUserRoleMutation,
  useUpdateUserRoleMutation,
  useDeleteUserRoleMutation,
  useListUserToRoleQuery,
  useLazyListUserToRoleQuery,
  useAssociatedUserToRoleMutation,
  useDeassociatedUserToRoleMutation,
  useListTaxRatesQuery,
  useLazyListTaxRatesQuery,
  useCreateTaxRateMutation,
  useGetTaxRateQuery,
  useLazyGetTaxRateQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,
  useLoginMutation,
  useChangePasswordMutation,
  useLogoutMutation,
  useListTillsQuery,
  useLazyListTillsQuery,
  useCreateTillMutation,
  useGetTillQuery,
  useLazyGetTillQuery,
  useUpdateTillMutation,
  useDeleteTillMutation,
  useForceLogoutUserMutation,
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
  useTransferRegisterMutation,
  useUpdateRegisterMutation,
  useDeleteRegisterMutation,
  useGetPublicConfigQuery,
  useLazyGetPublicConfigQuery,
  useListConfigEntriesQuery,
  useLazyListConfigEntriesQuery,
  useSetConfigEntryMutation,
  useListSystemAccountsQuery,
  useLazyListSystemAccountsQuery,
  useFindAccountsMutation,
  useGetAccountQuery,
  useLazyGetAccountQuery,
  useDisableAccountMutation,
  useUpdateBalanceMutation,
  useUpdateVoucherAmountMutation,
  useUpdateAccountCommentMutation,
  useListOrdersByTillQuery,
  useLazyListOrdersByTillQuery,
  useListOrdersQuery,
  useLazyListOrdersQuery,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useCancelOrderMutation,
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
  useListTicketsQuery,
  useLazyListTicketsQuery,
  useCreateTicketMutation,
  useGetTicketQuery,
  useLazyGetTicketQuery,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useFindUserTagsMutation,
  useGetUserTagDetailQuery,
  useLazyGetUserTagDetailQuery,
  useUpdateUserTagCommentMutation,
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
  usePayoutRunSepaXmlExportMutation,
  useGetTreeForCurrentUserQuery,
  useLazyGetTreeForCurrentUserQuery,
  useCreateNodeMutation,
  useUpdateNodeMutation,
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetRestrictedEventSettingsQuery,
  useLazyGetRestrictedEventSettingsQuery,
  useGenerateTestBonMutation,
  useListSumupCheckoutsQuery,
  useLazyListSumupCheckoutsQuery,
  useListSumupTransactionsQuery,
  useLazyListSumupTransactionsQuery,
  useGetSumupCheckoutQuery,
  useLazyGetSumupCheckoutQuery,
  useFindCustomersMutation,
  useGetCustomerQuery,
  useLazyGetCustomerQuery,
  useListTerminalsQuery,
  useLazyListTerminalsQuery,
  useCreateTerminalMutation,
  useGetTerminalQuery,
  useLazyGetTerminalQuery,
  useUpdateTerminalMutation,
  useDeleteTerminalMutation,
  useLogoutTerminalMutation,
} = injectedRtkApi;
