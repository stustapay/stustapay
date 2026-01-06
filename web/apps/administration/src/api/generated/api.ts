import { emptySplitApi as api } from "./emptyApi";
export const addTagTypes = [
  "accounts",
  "auth",
  "cashiers",
  "config",
  "entry",
  "llm",
  "mdm",
  "orders",
  "payouts",
  "products",
  "stats",
  "sumup",
  "tax-rates",
  "terminals",
  "tills",
  "tickets",
  "till-buttons",
  "till-layouts",
  "till-profiles",
  "till-register-stockings",
  "till-registers",
  "transactions",
  "tree",
  "tses",
  "user-roles",
  "user_tags",
  "user-to-roles",
  "users",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
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
      changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
        query: (queryArg) => ({ url: `/auth/change-password`, method: "POST", body: queryArg.changePasswordPayload }),
        invalidatesTags: ["auth"],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({ url: `/auth/login`, method: "POST", body: queryArg.loginPayload }),
        invalidatesTags: ["auth"],
      }),
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/auth/logout`, method: "POST" }),
        invalidatesTags: ["auth"],
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
      getCashierShifts: build.query<GetCashierShiftsApiResponse, GetCashierShiftsApiArg>({
        query: (queryArg) => ({
          url: `/cashiers/${queryArg.cashierId}/shifts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["cashiers"],
      }),
      listConfigEntries: build.query<ListConfigEntriesApiResponse, ListConfigEntriesApiArg>({
        query: () => ({ url: `/config` }),
        providesTags: ["config"],
      }),
      setConfigEntry: build.mutation<SetConfigEntryApiResponse, SetConfigEntryApiArg>({
        query: (queryArg) => ({ url: `/config`, method: "POST", body: queryArg.configEntry }),
        invalidatesTags: ["config"],
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
      getCustomer: build.query<GetCustomerApiResponse, GetCustomerApiArg>({
        query: (queryArg) => ({
          url: `/customers/${queryArg.customerId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["accounts"],
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
      createCashRegisterLlm: build.mutation<CreateCashRegisterLlmApiResponse, CreateCashRegisterLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/cash-registers`, method: "POST", body: queryArg.createCashRegisterPayload }),
        invalidatesTags: ["llm"],
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
      createProductLlm: build.mutation<CreateProductLlmApiResponse, CreateProductLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/products`, method: "POST", body: queryArg.createProductPayload }),
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
      createTerminalLlm: build.mutation<CreateTerminalLlmApiResponse, CreateTerminalLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/terminals`, method: "POST", body: queryArg.createTerminalPayload }),
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
      createTillButtonLlm: build.mutation<CreateTillButtonLlmApiResponse, CreateTillButtonLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/till-buttons`, method: "POST", body: queryArg.createTillButtonPayload }),
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
      createTillLayoutLlm: build.mutation<CreateTillLayoutLlmApiResponse, CreateTillLayoutLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/till-layouts`, method: "POST", body: queryArg.createTillLayoutPayload }),
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
      createTillLlm: build.mutation<CreateTillLlmApiResponse, CreateTillLlmApiArg>({
        query: (queryArg) => ({ url: `/llm/tills`, method: "POST", body: queryArg.createTillPayload }),
        invalidatesTags: ["llm"],
      }),
      listLlmTools: build.query<ListLlmToolsApiResponse, ListLlmToolsApiArg>({
        query: () => ({ url: `/llm/tools` }),
        providesTags: ["llm"],
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
      listOrdersByTill: build.query<ListOrdersByTillApiResponse, ListOrdersByTillApiArg>({
        query: (queryArg) => ({
          url: `/orders/by-till/${queryArg.tillId}`,
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
      getOrder: build.query<GetOrderApiResponse, GetOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders/${queryArg.orderId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["orders"],
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
      payoutRunPayouts: build.query<PayoutRunPayoutsApiResponse, PayoutRunPayoutsApiArg>({
        query: (queryArg) => ({
          url: `/payouts/${queryArg.payoutRunId}/payouts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["payouts"],
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
      getPublicConfig: build.query<GetPublicConfigApiResponse, GetPublicConfigApiArg>({
        query: () => ({ url: `/public-config` }),
        providesTags: ["config"],
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
      getPayOutStats: build.query<GetPayOutStatsApiResponse, GetPayOutStatsApiArg>({
        query: (queryArg) => ({
          url: `/stats/pay-outs`,
          params: {
            node_id: queryArg.nodeId,
            to_timestamp: queryArg.toTimestamp,
            from_timestamp: queryArg.fromTimestamp,
          },
        }),
        providesTags: ["stats"],
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
      listSumupCheckouts: build.query<ListSumupCheckoutsApiResponse, ListSumupCheckoutsApiArg>({
        query: (queryArg) => ({
          url: `/sumup/checkouts`,
          params: {
            node_id: queryArg.nodeId,
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
      listSystemAccounts: build.query<ListSystemAccountsApiResponse, ListSystemAccountsApiArg>({
        query: (queryArg) => ({
          url: `/system-accounts`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["accounts"],
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
      getTransaction: build.query<GetTransactionApiResponse, GetTransactionApiArg>({
        query: (queryArg) => ({
          url: `/transactions/${queryArg.transactionId}`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["transactions"],
      }),
      getTreeForCurrentUser: build.query<GetTreeForCurrentUserApiResponse, GetTreeForCurrentUserApiArg>({
        query: () => ({ url: `/tree/` }),
        providesTags: ["tree"],
      }),
      deleteEventBanner: build.mutation<DeleteEventBannerApiResponse, DeleteEventBannerApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/banner`, method: "DELETE" }),
        invalidatesTags: ["tree"],
      }),
      getEventBanner: build.query<GetEventBannerApiResponse, GetEventBannerApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/banner` }),
        providesTags: ["tree"],
      }),
      uploadEventBanner: build.mutation<UploadEventBannerApiResponse, UploadEventBannerApiArg>({
        query: (queryArg) => ({
          url: `/tree/events/${queryArg.nodeId}/banner`,
          method: "POST",
          body: queryArg.bodyUploadEventBannerTreeEventsNodeIdBannerPost,
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
      generateTestBon: build.mutation<GenerateTestBonApiResponse, GenerateTestBonApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/generate-test-bon`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      generateTestReport: build.mutation<GenerateTestReportApiResponse, GenerateTestReportApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/generate-test-report`, method: "POST" }),
        invalidatesTags: ["tree"],
      }),
      getRestrictedEventSettings: build.query<GetRestrictedEventSettingsApiResponse, GetRestrictedEventSettingsApiArg>({
        query: (queryArg) => ({ url: `/tree/events/${queryArg.nodeId}/settings` }),
        providesTags: ["tree"],
      }),
      deleteNode: build.mutation<DeleteNodeApiResponse, DeleteNodeApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}`, method: "DELETE" }),
        invalidatesTags: ["tree"],
      }),
      archiveNode: build.mutation<ArchiveNodeApiResponse, ArchiveNodeApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/archive-node`, method: "POST" }),
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
      createEvent: build.mutation<CreateEventApiResponse, CreateEventApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/create-event`,
          method: "POST",
          body: queryArg.newEvent,
        }),
        invalidatesTags: ["tree"],
      }),
      createNode: build.mutation<CreateNodeApiResponse, CreateNodeApiArg>({
        query: (queryArg) => ({
          url: `/tree/nodes/${queryArg.nodeId}/create-node`,
          method: "POST",
          body: queryArg.newNode,
        }),
        invalidatesTags: ["tree"],
      }),
      generateRevenueReport: build.mutation<GenerateRevenueReportApiResponse, GenerateRevenueReportApiArg>({
        query: (queryArg) => ({ url: `/tree/nodes/${queryArg.nodeId}/generate-revenue-report`, method: "POST" }),
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
      listUserTagSecrets: build.query<ListUserTagSecretsApiResponse, ListUserTagSecretsApiArg>({
        query: (queryArg) => ({
          url: `/user-tag-secrets`,
          params: {
            node_id: queryArg.nodeId,
          },
        }),
        providesTags: ["user_tags"],
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
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
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
export type UpdateAccountCommentApiResponse = /** status 200 Successful Response */ AccountRead;
export type UpdateAccountCommentApiArg = {
  accountId: number;
  nodeId: number;
  updateAccountCommentPayload: UpdateAccountCommentPayload;
};
export type UpdateVoucherAmountApiResponse = /** status 200 Successful Response */ any;
export type UpdateVoucherAmountApiArg = {
  accountId: number;
  nodeId: number;
  updateVoucherAmountPayload: UpdateVoucherAmountPayload;
};
export type ChangePasswordApiResponse = /** status 200 Successful Response */ any;
export type ChangePasswordApiArg = {
  changePasswordPayload: ChangePasswordPayload;
};
export type LoginApiResponse = /** status 200 Successful Response */ UserLoginResult;
export type LoginApiArg = {
  loginPayload: LoginPayload;
};
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type ListCashiersApiResponse = /** status 200 Successful Response */ NormalizedListCashierInt;
export type ListCashiersApiArg = {
  nodeId: number;
};
export type GetCashierApiResponse = /** status 200 Successful Response */ CashierRead;
export type GetCashierApiArg = {
  cashierId: number;
  nodeId: number;
};
export type CloseOutCashierApiResponse = /** status 200 Successful Response */ CloseOutResult;
export type CloseOutCashierApiArg = {
  cashierId: number;
  nodeId: number;
  closeOut: CloseOut;
};
export type GetCashierShiftStatsApiResponse = /** status 200 Successful Response */ CashierShiftStatsRead;
export type GetCashierShiftStatsApiArg = {
  cashierId: number;
  nodeId: number;
  shiftId?: number | null;
};
export type GetCashierShiftsApiResponse = /** status 200 Successful Response */ NormalizedListCashierShiftInt;
export type GetCashierShiftsApiArg = {
  cashierId: number;
  nodeId: number;
};
export type ListConfigEntriesApiResponse = /** status 200 Successful Response */ NormalizedListConfigEntryStr;
export type ListConfigEntriesApiArg = void;
export type SetConfigEntryApiResponse = /** status 200 Successful Response */ ConfigEntry;
export type SetConfigEntryApiArg = {
  configEntry: ConfigEntry;
};
export type FindCustomersApiResponse = /** status 200 Successful Response */ CustomerRead[];
export type FindCustomersApiArg = {
  nodeId: number;
  findCustomerPayload: FindCustomerPayload;
};
export type GetCustomerApiResponse = /** status 200 Successful Response */ CustomerRead;
export type GetCustomerApiArg = {
  customerId: number;
  nodeId: number;
};
export type AllowCustomerPayoutApiResponse = /** status 200 Successful Response */ any;
export type AllowCustomerPayoutApiArg = {
  customerId: number;
  nodeId: number;
};
export type PreventCustomerPayoutApiResponse = /** status 200 Successful Response */ any;
export type PreventCustomerPayoutApiArg = {
  customerId: number;
  nodeId: number;
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
export type DeleteEntryAreaApiResponse = unknown;
export type DeleteEntryAreaApiArg = {
  areaId: number;
  nodeId: number;
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
export type DeleteEntryAreaGroupWindowApiResponse = unknown;
export type DeleteEntryAreaGroupWindowApiArg = {
  areaId: number;
  groupId: number;
  windowId: number;
  nodeId: number;
};
export type UpdateEntryAreaGroupWindowApiResponse = /** status 200 Successful Response */ EntryAreaGroupWindow;
export type UpdateEntryAreaGroupWindowApiArg = {
  areaId: number;
  groupId: number;
  windowId: number;
  nodeId: number;
  newEntryAreaGroupWindow: NewEntryAreaGroupWindow;
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
export type DeleteEntryGroupApiResponse = unknown;
export type DeleteEntryGroupApiArg = {
  groupId: number;
  nodeId: number;
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
export type CreateCashRegisterLlmApiResponse = /** status 200 Successful Response */ CashRegister;
export type CreateCashRegisterLlmApiArg = {
  createCashRegisterPayload: CreateCashRegisterPayload;
};
export type ListEventsLlmApiResponse = /** status 200 Successful Response */ EventSummary[];
export type ListEventsLlmApiArg = {
  nameQuery?: string | null;
};
export type CreateProductLlmApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductLlmApiArg = {
  createProductPayload: CreateProductPayload;
};
export type ListTaxRatesLlmApiResponse = /** status 200 Successful Response */ TaxRate[];
export type ListTaxRatesLlmApiArg = {
  nodeId: number;
};
export type CreateTerminalLlmApiResponse = /** status 200 Successful Response */ Terminal;
export type CreateTerminalLlmApiArg = {
  createTerminalPayload: CreateTerminalPayload;
};
export type ListTillButtonsLlmApiResponse = /** status 200 Successful Response */ TillButton[];
export type ListTillButtonsLlmApiArg = {
  nodeId: number;
};
export type CreateTillButtonLlmApiResponse = /** status 200 Successful Response */ TillButton;
export type CreateTillButtonLlmApiArg = {
  createTillButtonPayload: CreateTillButtonPayload;
};
export type ListTillLayoutsLlmApiResponse = /** status 200 Successful Response */ TillLayout[];
export type ListTillLayoutsLlmApiArg = {
  nodeId: number;
};
export type CreateTillLayoutLlmApiResponse = /** status 200 Successful Response */ TillLayout;
export type CreateTillLayoutLlmApiArg = {
  createTillLayoutPayload: CreateTillLayoutPayload;
};
export type ListTillProfilesLlmApiResponse = /** status 200 Successful Response */ TillProfile[];
export type ListTillProfilesLlmApiArg = {
  nodeId: number;
};
export type CreateTillLlmApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillLlmApiArg = {
  createTillPayload: CreateTillPayload;
};
export type ListLlmToolsApiResponse = /** status 200 Successful Response */ ToolDescription[];
export type ListLlmToolsApiArg = void;
export type ListHeadwindDevicesApiResponse = /** status 200 Successful Response */ HeadwindDeviceWithMapping[];
export type ListHeadwindDevicesApiArg = {
  nodeId: number;
  page?: number;
  pageSize?: number;
  search?: string | null;
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
export type ListOrdersApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersApiArg = {
  nodeId: number;
  customerAccountId: number;
};
export type ListOrdersByTillApiResponse = /** status 200 Successful Response */ NormalizedListOrderInt;
export type ListOrdersByTillApiArg = {
  tillId: number;
  nodeId: number;
};
export type CancelOrderApiResponse = /** status 200 Successful Response */ any;
export type CancelOrderApiArg = {
  orderId: number;
  nodeId: number;
};
export type GetOrderApiResponse = /** status 200 Successful Response */ OrderRead;
export type GetOrderApiArg = {
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
export type PayoutRunCsvExportApiResponse = /** status 200 Successful Response */ string;
export type PayoutRunCsvExportApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type PayoutRunPayoutsApiResponse = /** status 200 Successful Response */ PayoutRead[];
export type PayoutRunPayoutsApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type PreviousPayoutRunSepaXmlApiResponse = /** status 200 Successful Response */ string;
export type PreviousPayoutRunSepaXmlApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type RevokePayoutRunApiResponse = /** status 200 Successful Response */ any;
export type RevokePayoutRunApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type PayoutRunSepaXmlApiResponse = /** status 200 Successful Response */ string;
export type PayoutRunSepaXmlApiArg = {
  payoutRunId: number;
  nodeId: number;
  createSepaXmlPayload: CreateSepaXmlPayload;
};
export type SetPayoutRunAsDoneApiResponse = /** status 200 Successful Response */ any;
export type SetPayoutRunAsDoneApiArg = {
  payoutRunId: number;
  nodeId: number;
};
export type ListProductsApiResponse = /** status 200 Successful Response */ NormalizedListProductInt;
export type ListProductsApiArg = {
  nodeId: number;
};
export type CreateProductApiResponse = /** status 200 Successful Response */ Product;
export type CreateProductApiArg = {
  nodeId: number;
  newProduct: NewProduct;
};
export type DeleteProductApiResponse = /** status 200 Successful Response */ any;
export type DeleteProductApiArg = {
  productId: number;
  nodeId: number;
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
export type GetPublicConfigApiResponse = /** status 200 Successful Response */ Config;
export type GetPublicConfigApiArg = void;
export type GetEntryStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetEntryStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type GetPayOutStatsApiResponse = /** status 200 Successful Response */ TimeseriesStats;
export type GetPayOutStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type GetProductStatsApiResponse = /** status 200 Successful Response */ ProductStats;
export type GetProductStatsApiArg = {
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
export type GetVoucherStatsApiResponse = /** status 200 Successful Response */ VoucherStats;
export type GetVoucherStatsApiArg = {
  nodeId: number;
  toTimestamp?: string | null;
  fromTimestamp?: string | null;
};
export type ListSumupCheckoutsApiResponse = /** status 200 Successful Response */ SumUpCheckout[];
export type ListSumupCheckoutsApiArg = {
  nodeId: number;
};
export type GetSumupCheckoutApiResponse = /** status 200 Successful Response */ SumUpCheckout;
export type GetSumupCheckoutApiArg = {
  checkoutId: string;
  nodeId: number;
};
export type ListSumupTransactionsApiResponse = /** status 200 Successful Response */ SumUpTransaction[];
export type ListSumupTransactionsApiArg = {
  nodeId: number;
  limit?: number;
  transactionCode?: string | null;
  newestTime?: string | null;
};
export type ListSystemAccountsApiResponse = /** status 200 Successful Response */ NormalizedListAccountInt;
export type ListSystemAccountsApiArg = {
  nodeId: number;
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
export type DeleteTaxRateApiResponse = /** status 200 Successful Response */ any;
export type DeleteTaxRateApiArg = {
  taxRateId: number;
  nodeId: number;
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
export type ListTerminalsApiResponse = /** status 200 Successful Response */ NormalizedListTerminalInt;
export type ListTerminalsApiArg = {
  nodeId: number;
};
export type CreateTerminalApiResponse = /** status 200 Successful Response */ Terminal;
export type CreateTerminalApiArg = {
  nodeId: number;
  newTerminal: NewTerminal;
};
export type DeleteTerminalApiResponse = /** status 200 Successful Response */ any;
export type DeleteTerminalApiArg = {
  terminalId: number;
  nodeId: number;
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
export type ListTicketsApiResponse = /** status 200 Successful Response */ NormalizedListTicketInt;
export type ListTicketsApiArg = {
  nodeId: number;
};
export type CreateTicketApiResponse = /** status 200 Successful Response */ Ticket;
export type CreateTicketApiArg = {
  nodeId: number;
  newTicket: NewTicket;
};
export type DeleteTicketApiResponse = /** status 200 Successful Response */ any;
export type DeleteTicketApiArg = {
  ticketId: number;
  nodeId: number;
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
export type ListTillButtonsApiResponse = /** status 200 Successful Response */ NormalizedListTillButtonInt;
export type ListTillButtonsApiArg = {
  nodeId: number;
};
export type CreateTillButtonApiResponse = /** status 200 Successful Response */ NewTillButton;
export type CreateTillButtonApiArg = {
  nodeId: number;
  newTillButton: NewTillButton;
};
export type DeleteTillButtonApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillButtonApiArg = {
  buttonId: number;
  nodeId: number;
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
export type ListTillLayoutsApiResponse = /** status 200 Successful Response */ NormalizedListTillLayoutInt;
export type ListTillLayoutsApiArg = {
  nodeId: number;
};
export type CreateTillLayoutApiResponse = /** status 200 Successful Response */ NewTillLayout;
export type CreateTillLayoutApiArg = {
  nodeId: number;
  newTillLayout: NewTillLayout;
};
export type DeleteTillLayoutApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillLayoutApiArg = {
  layoutId: number;
  nodeId: number;
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
export type ListTillProfilesApiResponse = /** status 200 Successful Response */ NormalizedListTillProfileInt;
export type ListTillProfilesApiArg = {
  nodeId: number;
};
export type CreateTillProfileApiResponse = /** status 200 Successful Response */ NewTillProfile;
export type CreateTillProfileApiArg = {
  nodeId: number;
  newTillProfile: NewTillProfile;
};
export type DeleteTillProfileApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillProfileApiArg = {
  profileId: number;
  nodeId: number;
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
export type DeleteRegisterStockingApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterStockingApiArg = {
  stockingId: number;
  nodeId: number;
};
export type UpdateRegisterStockingApiResponse = /** status 200 Successful Response */ CashRegisterStocking;
export type UpdateRegisterStockingApiArg = {
  stockingId: number;
  nodeId: number;
  newCashRegisterStocking: NewCashRegisterStocking;
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
export type TransferRegisterApiResponse = /** status 200 Successful Response */ any;
export type TransferRegisterApiArg = {
  nodeId: number;
  transferRegisterPayload: TransferRegisterPayload;
};
export type DeleteRegisterApiResponse = /** status 200 Successful Response */ any;
export type DeleteRegisterApiArg = {
  registerId: number;
  nodeId: number;
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
export type ListTillsApiResponse = /** status 200 Successful Response */ NormalizedListTillInt;
export type ListTillsApiArg = {
  nodeId: number;
};
export type CreateTillApiResponse = /** status 200 Successful Response */ Till;
export type CreateTillApiArg = {
  nodeId: number;
  newTill: NewTill;
};
export type DeleteTillApiResponse = /** status 200 Successful Response */ any;
export type DeleteTillApiArg = {
  tillId: number;
  nodeId: number;
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
export type GetTransactionApiResponse = /** status 200 Successful Response */ TransactionRead;
export type GetTransactionApiArg = {
  transactionId: number;
  nodeId: number;
};
export type GetTreeForCurrentUserApiResponse = /** status 200 Successful Response */ NodeSeenByUser;
export type GetTreeForCurrentUserApiArg = void;
export type DeleteEventBannerApiResponse = /** status 200 Successful Response */ any;
export type DeleteEventBannerApiArg = {
  nodeId: number;
};
export type GetEventBannerApiResponse = /** status 200 Successful Response */ any;
export type GetEventBannerApiArg = {
  nodeId: number;
};
export type UploadEventBannerApiResponse = /** status 200 Successful Response */ any;
export type UploadEventBannerApiArg = {
  nodeId: number;
  bodyUploadEventBannerTreeEventsNodeIdBannerPost: BodyUploadEventBannerTreeEventsNodeIdBannerPost;
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
export type GenerateTestBonApiResponse = /** status 200 Successful Response */ BonJsonRead;
export type GenerateTestBonApiArg = {
  nodeId: number;
};
export type GenerateTestReportApiResponse = /** status 200 Successful Response */ any;
export type GenerateTestReportApiArg = {
  nodeId: number;
};
export type GetRestrictedEventSettingsApiResponse = /** status 200 Successful Response */ RestrictedEventSettings;
export type GetRestrictedEventSettingsApiArg = {
  nodeId: number;
};
export type DeleteNodeApiResponse = /** status 200 Successful Response */ any;
export type DeleteNodeApiArg = {
  nodeId: number;
};
export type ArchiveNodeApiResponse = /** status 200 Successful Response */ any;
export type ArchiveNodeApiArg = {
  nodeId: number;
};
export type ConfigureSumupTokenApiResponse = /** status 200 Successful Response */ any;
export type ConfigureSumupTokenApiArg = {
  nodeId: number;
  sumUpTokenPayload: SumUpTokenPayload;
};
export type CreateEventApiResponse = /** status 200 Successful Response */ Node;
export type CreateEventApiArg = {
  nodeId: number;
  newEvent: NewEvent;
};
export type CreateNodeApiResponse = /** status 200 Successful Response */ Node;
export type CreateNodeApiArg = {
  nodeId: number;
  newNode: NewNode;
};
export type GenerateRevenueReportApiResponse = /** status 200 Successful Response */ any;
export type GenerateRevenueReportApiArg = {
  nodeId: number;
};
export type UpdateNodeApiResponse = /** status 200 Successful Response */ Node;
export type UpdateNodeApiArg = {
  nodeId: number;
  newNode: NewNode;
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
export type ListUserRolesApiResponse = /** status 200 Successful Response */ NormalizedListUserRoleInt;
export type ListUserRolesApiArg = {
  nodeId: number;
};
export type CreateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type CreateUserRoleApiArg = {
  nodeId: number;
  newUserRole: NewUserRole;
};
export type DeleteUserRoleApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserRoleApiArg = {
  userRoleId: number;
  nodeId: number;
};
export type UpdateUserRoleApiResponse = /** status 200 Successful Response */ UserRole;
export type UpdateUserRoleApiArg = {
  userRoleId: number;
  nodeId: number;
  updateUserRolePrivilegesPayload: UpdateUserRolePrivilegesPayload;
};
export type ListUserTagSecretsApiResponse = /** status 200 Successful Response */ UserTagSecret[];
export type ListUserTagSecretsApiArg = {
  nodeId: number;
};
export type CreateUserTagSecretApiResponse = /** status 200 Successful Response */ UserTagSecret;
export type CreateUserTagSecretApiArg = {
  nodeId: number;
  newUserTagSecret: NewUserTagSecret;
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
export type UpdateUserTagGroupTagApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagGroupTagApiArg = {
  userTagId: number;
  nodeId: number;
  updateGroupTagPayload: UpdateGroupTagPayload;
};
export type UpdateUserTagVipStatusApiResponse = /** status 200 Successful Response */ UserTagDetail;
export type UpdateUserTagVipStatusApiArg = {
  userTagId: number;
  nodeId: number;
  updateVipStatusPayload: UpdateVipStatusPayload;
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
export type DeleteUserApiResponse = /** status 200 Successful Response */ any;
export type DeleteUserApiArg = {
  userId: number;
  nodeId: number;
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
export type ChangeUserPasswordApiResponse = /** status 200 Successful Response */ UserRead;
export type ChangeUserPasswordApiArg = {
  userId: number;
  nodeId: number;
  changeUserPasswordPayload: ChangeUserPasswordPayload;
};
export type ProductRestriction = "under_16" | "under_18";
export type UserTagHistoryEntry = {
  account_id: number;
  comment?: string | null;
  mapping_was_valid_until: string;
  user_tag_id: number;
  user_tag_pin: string;
  user_tag_uid: number | null;
};
export type UserTagHistoryEntryRead = {
  account_id: number;
  comment?: string | null;
  mapping_was_valid_until: string;
  user_tag_id: number;
  user_tag_pin: string;
  user_tag_uid: number | null;
  user_tag_uid_hex: string | null;
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
export type Account = {
  balance: number;
  comment: string | null;
  id: number;
  is_vip?: boolean;
  name: string | null;
  node_id: number;
  restriction: ProductRestriction | null;
  tag_history: UserTagHistoryEntry[];
  type: AccountType;
  user_tag_comment?: string | null;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  vip_max_balance?: number | null;
  vouchers: number;
};
export type AccountRead = {
  balance: number;
  comment: string | null;
  id: number;
  is_vip?: boolean;
  name: string | null;
  node_id: number;
  restriction: ProductRestriction | null;
  tag_history: UserTagHistoryEntryRead[];
  type: AccountType;
  user_tag_comment?: string | null;
  user_tag_id: number | null;
  user_tag_uid: number | null;
  user_tag_uid_hex: string | null;
  vip_max_balance?: number | null;
  vouchers: number;
};
export type NormalizedListAccountInt = {
  entities: {
    [key: string]: Account;
  };
  ids: number[];
};
export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};
export type HttpValidationError = {
  detail?: ValidationError[];
};
export type FindAccountPayload = {
  search_term: string;
};
export type UpdateBalancePayload = {
  new_balance: number;
};
export type UpdateAccountCommentPayload = {
  comment: string;
};
export type UpdateVoucherAmountPayload = {
  new_voucher_amount: number;
};
export type ChangePasswordPayload = {
  new_password: string;
  old_password: string;
};
export type NodeChoice = {
  description: string;
  name: string;
  node_id: number;
};
export type Privilege =
  | "node_administration"
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
export type CurrentUser = {
  active_role_id?: number | null;
  active_role_name?: string | null;
  cash_register_id?: number | null;
  description?: string | null;
  display_name: string;
  id: number;
  login: string;
  node_id: number;
  privileges: Privilege[];
  transport_account_id?: number | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
};
export type UserLoginSuccess = {
  token: string;
  user: CurrentUser;
};
export type UserLoginResult = {
  available_nodes: NodeChoice[] | null;
  success: UserLoginSuccess | null;
};
export type LoginPayload = {
  node_id?: number | null;
  password: string;
  username: string;
};
export type Cashier = {
  cash_drawer_balance: number | null;
  cash_register_id?: number | null;
  description?: string | null;
  display_name: string;
  id: number;
  login: string;
  node_id: number;
  terminal_ids: number[];
  transport_account_id?: number | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
};
export type CashierRead = {
  cash_drawer_balance: number | null;
  cash_register_id?: number | null;
  description?: string | null;
  display_name: string;
  id: number;
  login: string;
  node_id: number;
  terminal_ids: number[];
  transport_account_id?: number | null;
  user_tag_id?: number | null;
  user_tag_uid?: number | null;
  user_tag_uid_hex: string | null;
};
export type NormalizedListCashierInt = {
  entities: {
    [key: string]: Cashier;
  };
  ids: number[];
};
export type CloseOutResult = {
  cashier_id: number;
  imbalance: number;
};
export type CloseOut = {
  actual_cash_drawer_balance: number;
  closing_out_user_id: number;
  comment: string;
};
export type ProductType = "discount" | "topup" | "payout" | "money_transfer" | "imbalance" | "user_defined" | "ticket";
export type Product = {
  fixed_price: boolean;
  id: number;
  is_locked: boolean;
  is_returnable: boolean;
  name: string;
  node_id: number;
  price: number | null;
  price_in_vouchers?: number | null;
  price_per_voucher?: number | null;
  restrictions: ProductRestriction[];
  target_account_id?: number | null;
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
  type: ProductType;
};
export type CashierProductStats = {
  product: Product;
  quantity: number;
};
export type LineItem = {
  item_id: number;
  product: Product;
  product_price: number;
  quantity: number;
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
  total_tax: number;
};
export type LineItemRead = {
  item_id: number;
  product: Product;
  product_price: number;
  quantity: number;
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
  total_price: number;
  total_tax: number;
};
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
export type PaymentMethod = "cash" | "sumup" | "tag" | "sumup_online";
export type Order = {
  booked_at: string;
  cancels_order: number | null;
  cash_register_id: number | null;
  cashier_id: number | null;
  customer_account_id: number | null;
  customer_tag_id: number | null;
  customer_tag_uid: number | null;
  id: number;
  line_items: LineItem[];
  order_type: OrderType;
  payment_method: PaymentMethod;
  till_id: number | null;
  total_no_tax: number;
  total_price: number;
  total_tax: number;
  uuid: string;
};
export type OrderRead = {
  booked_at: string;
  cancels_order: number | null;
  cash_register_id: number | null;
  cashier_id: number | null;
  customer_account_id: number | null;
  customer_tag_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_uid_hex: string | null;
  id: number;
  line_items: LineItemRead[];
  order_type: OrderType;
  payment_method: PaymentMethod;
  till_id: number | null;
  total_no_tax: number;
  total_price: number;
  total_tax: number;
  uuid: string;
};
export type CashierShiftStats = {
  booked_products: CashierProductStats[];
  orders: Order[];
};
export type CashierShiftStatsRead = {
  booked_products: CashierProductStats[];
  orders: OrderRead[];
};
export type CashierShift = {
  actual_cash_drawer_balance: number;
  cash_drawer_imbalance: number;
  cash_register_id: number | null;
  cashier_id: number;
  closing_out_user_id: number;
  comment: string;
  ended_at: string;
  expected_cash_drawer_balance: number;
  id: number;
  started_at: string;
};
export type NormalizedListCashierShiftInt = {
  entities: {
    [key: string]: CashierShift;
  };
  ids: number[];
};
export type ConfigEntry = {
  key: string;
  value: string | null;
};
export type NormalizedListConfigEntryStr = {
  entities: {
    [key: string]: ConfigEntry;
  };
  ids: string[];
};
export type Payout = {
  account_name: string | null;
  amount: number;
  customer_account_id: number;
  donation: number;
  email: string | null;
  iban: string | null;
  id: number;
  payout_run_id: number;
  user_tag_id: number;
  user_tag_uid: number;
};
export type PayoutRead = {
  account_name: string | null;
  amount: number;
  customer_account_id: number;
  donation: number;
  email: string | null;
  iban: string | null;
  id: number;
  payout_run_id: number;
  user_tag_id: number;
  user_tag_uid: number;
  user_tag_uid_hex: string | null;
};
export type Customer = {
  account_name: string | null;
  balance: number;
  comment: string | null;
  donate_all: boolean;
  donation: number | null;
  email: string | null;
  has_entered_info: boolean;
  iban: string | null;
  id: number;
  is_vip?: boolean;
  name: string | null;
  node_id: number;
  payout: Payout | null;
  payout_export: boolean | null;
  restriction: ProductRestriction | null;
  tag_history: UserTagHistoryEntry[];
  type: AccountType;
  user_tag_comment?: string | null;
  user_tag_id: number | null;
  user_tag_pin: string | null;
  user_tag_uid: number | null;
  vip_max_balance?: number | null;
  vouchers: number;
};
export type CustomerRead = {
  account_name: string | null;
  balance: number;
  comment: string | null;
  donate_all: boolean;
  donation: number | null;
  email: string | null;
  has_entered_info: boolean;
  iban: string | null;
  id: number;
  is_vip?: boolean;
  name: string | null;
  node_id: number;
  payout: PayoutRead | null;
  payout_export: boolean | null;
  restriction: ProductRestriction | null;
  tag_history: UserTagHistoryEntryRead[];
  type: AccountType;
  user_tag_comment?: string | null;
  user_tag_id: number | null;
  user_tag_pin: string | null;
  user_tag_uid: number | null;
  user_tag_uid_hex: string | null;
  vip_max_balance?: number | null;
  vouchers: number;
};
export type FindCustomerPayload = {
  search_term: string;
};
export type EntryArea = {
  description?: string | null;
  id: number;
  name: string;
  node_id: number;
};
export type NormalizedListEntryAreaInt = {
  entities: {
    [key: string]: EntryArea;
  };
  ids: number[];
};
export type NewEntryArea = {
  description?: string | null;
  name: string;
};
export type EntryAreaGroupWithGroup = {
  area_id: number;
  group_description?: string | null;
  group_id: number;
  group_name: string;
  id: number;
};
export type EntryAreaGroup = {
  area_id: number;
  group_id: number;
  id: number;
};
export type EntryAreaGroupAssignPayload = {
  group_id: number;
};
export type EntryAreaGroupWindow = {
  area_group_id: number;
  end_at: string;
  id: number;
  start_at: string;
};
export type NewEntryAreaGroupWindow = {
  end_at: string;
  start_at: string;
};
export type EntryGroup = {
  description?: string | null;
  id: number;
  name: string;
  node_id: number;
};
export type NormalizedListEntryGroupInt = {
  entities: {
    [key: string]: EntryGroup;
  };
  ids: number[];
};
export type NewEntryGroup = {
  description?: string | null;
  name: string;
};
export type EntryGroupMember = {
  comment?: string | null;
  is_vip?: boolean;
  user_tag_id: number;
  user_tag_pin: string;
  user_tag_uid: number | null;
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
  allowed: boolean;
  area_id: number;
  area_name: string;
  direction: EntryDirection;
  group_id: number | null;
  group_name: string | null;
  id: number;
  node_id: number;
  reason: string;
  scanned_at: string;
  terminal_id: number;
  terminal_name: string;
  user_tag_id: number | null;
  user_tag_uid: number;
};
export type CashRegister = {
  account_id: number;
  balance: number;
  current_cashier_id: number | null;
  current_till_id: number | null;
  id: number;
  name: string;
  node_id: number;
};
export type NewCashRegister = {
  name: string;
};
export type CreateCashRegisterPayload = {
  cash_register: NewCashRegister;
  /** ID of the node/event the cash register belongs to. */
  node_id: number;
};
export type EventSummary = {
  description: string;
  end_date?: string | null;
  event_id: number;
  event_name: string;
  node_id: number;
  node_name: string;
  path: string;
  start_date?: string | null;
};
export type NewProduct = {
  fixed_price?: boolean;
  is_locked?: boolean;
  is_returnable?: boolean;
  name: string;
  price: number | null;
  price_in_vouchers?: number | null;
  restrictions?: ProductRestriction[];
  target_account_id?: number | null;
  tax_rate_id: number;
};
export type CreateProductPayload = {
  /** ID of the node/event the product belongs to. */
  node_id: number;
  product: NewProduct;
};
export type TaxRate = {
  description: string;
  id: number;
  name: string;
  node_id: number;
  rate: number;
};
export type TerminalMode = "till" | "entry" | "exit";
export type Terminal = {
  active_user_id?: number | null;
  active_user_role_id?: number | null;
  description?: string | null;
  entry_area_id?: number | null;
  id: number;
  mode?: TerminalMode;
  name: string;
  node_id: number;
  registration_uuid: string | null;
  session_uuid: string | null;
  till_id: number | null;
};
export type NewTerminal = {
  description?: string | null;
  entry_area_id?: number | null;
  mode?: TerminalMode;
  name: string;
};
export type CreateTerminalPayload = {
  /** ID of the node/event the terminal belongs to. */
  node_id: number;
  terminal: NewTerminal;
};
export type TillButton = {
  id: number;
  name: string;
  node_id: number;
  price: number;
  product_ids: number[];
};
export type NewTillButton = {
  name: string;
  product_ids: number[];
};
export type CreateTillButtonPayload = {
  button: NewTillButton;
  /** ID of the node/event the button belongs to. */
  node_id: number;
};
export type TillLayout = {
  button_ids?: number[] | null;
  description: string;
  id: number;
  name: string;
  node_id: number;
  ticket_ids?: number[] | null;
};
export type NewTillLayout = {
  button_ids?: number[] | null;
  description: string;
  name: string;
  ticket_ids?: number[] | null;
};
export type CreateTillLayoutPayload = {
  layout: NewTillLayout;
  /** ID of the node/event the layout belongs to. */
  node_id: number;
};
export type TillProfile = {
  allow_cash_out: boolean;
  allow_ticket_sale: boolean;
  allow_ticket_vouchers: boolean;
  allow_top_up: boolean;
  description?: string | null;
  enable_card_payment: boolean;
  enable_cash_payment: boolean;
  enable_ssp_payment: boolean;
  id: number;
  layout_id: number;
  name: string;
  node_id: number;
};
export type Till = {
  active_cash_register_id?: number | null;
  active_profile_id: number;
  active_shift?: string | null;
  current_cash_register_balance?: number | null;
  current_cash_register_name?: string | null;
  description?: string | null;
  id: number;
  name: string;
  node_id: number;
  terminal_id?: number | null;
  tse_id?: number | null;
  tse_serial?: string | null;
  z_nr: number;
};
export type NewTill = {
  active_profile_id: number;
  active_shift?: string | null;
  description?: string | null;
  name: string;
  terminal_id?: number | null;
};
export type CreateTillPayload = {
  /** ID of the node/event the till belongs to. */
  node_id: number;
  till: NewTill;
};
export type ToolDescription = {
  description: string;
  input_schema?: {
    [key: string]: any;
  } | null;
  method: "GET" | "POST";
  name: string;
  path: string;
};
export type HeadwindDevice = {
  configurationName?: string | null;
  description?: string | null;
  deviceNumber?: string | null;
  id: number | string;
  imei?: string | null;
  lastIp?: string | null;
  lastUpdate?: number | string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial?: string | null;
  [key: string]: any;
};
export type HeadwindDeviceMappingWithTerminal = {
  created_at: string;
  headwind_device_id: string;
  headwind_device_model?: string | null;
  headwind_device_name?: string | null;
  headwind_device_number?: string | null;
  headwind_device_serial?: string | null;
  id: number;
  last_push_error?: string | null;
  last_push_status?: string | null;
  last_synced_at?: string | null;
  last_token_pushed_at?: string | null;
  node_id: number;
  terminal_description?: string | null;
  terminal_id: number;
  terminal_name: string;
  updated_at: string;
};
export type HeadwindDeviceWithMapping = {
  device: HeadwindDevice;
  mapping?: HeadwindDeviceMappingWithTerminal | null;
};
export type CreateHeadwindMappingPayload = {
  headwind_device_id: string;
  headwind_device_model?: string | null;
  headwind_device_name?: string | null;
  headwind_device_number?: string | null;
  headwind_device_serial?: string | null;
  terminal_id: number;
};
export type NormalizedListOrderInt = {
  entities: {
    [key: string]: Order;
  };
  ids: number[];
};
export type BonConfig = {
  address: string;
  issuer: string;
  title: string;
  ust_id: string;
};
export type OrderWithTse = {
  booked_at: string;
  cancels_order: number | null;
  cash_register_id: number | null;
  cashier_id: number | null;
  customer_account_id: number | null;
  customer_tag_id: number | null;
  customer_tag_uid: number | null;
  id: number;
  line_items: LineItem[];
  node_id: number;
  order_type: OrderType;
  payment_method: PaymentMethod;
  signature_status: string;
  till_id: number | null;
  total_no_tax: number;
  total_price: number;
  total_tax: number;
  transaction_process_data?: string | null;
  transaction_process_type?: string | null;
  tse_end?: string | null;
  tse_hashalgo?: string | null;
  tse_public_key?: string | null;
  tse_signature?: string | null;
  tse_signaturenr?: string | null;
  tse_start?: string | null;
  tse_time_format?: string | null;
  tse_transaction?: string | null;
  uuid: string;
};
export type OrderWithTseRead = {
  booked_at: string;
  cancels_order: number | null;
  cash_register_id: number | null;
  cashier_id: number | null;
  customer_account_id: number | null;
  customer_tag_id: number | null;
  customer_tag_uid: number | null;
  customer_tag_uid_hex: string | null;
  id: number;
  line_items: LineItemRead[];
  node_id: number;
  order_type: OrderType;
  payment_method: PaymentMethod;
  signature_status: string;
  till_id: number | null;
  total_no_tax: number;
  total_price: number;
  total_tax: number;
  transaction_process_data?: string | null;
  transaction_process_type?: string | null;
  tse_end?: string | null;
  tse_hashalgo?: string | null;
  tse_public_key?: string | null;
  tse_qr_code_text: string;
  tse_signature?: string | null;
  tse_signaturenr?: string | null;
  tse_start?: string | null;
  tse_time_format?: string | null;
  tse_transaction?: string | null;
  uuid: string;
};
export type TaxRateAggregation = {
  tax_name: string;
  tax_rate: number;
  total_no_tax: number;
  total_price: number;
  total_tax: number;
};
export type BonJson = {
  config: BonConfig;
  currency_identifier: string;
  order: OrderWithTse;
  tax_rate_aggregations: TaxRateAggregation[];
};
export type BonJsonRead = {
  config: BonConfig;
  currency_identifier: string;
  order: OrderWithTseRead;
  tax_rate_aggregations: TaxRateAggregation[];
};
export type PendingLineItem = {
  product: Product;
  product_price: number;
  quantity: number;
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
};
export type PendingLineItemRead = {
  product: Product;
  product_price: number;
  quantity: number;
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
  total_price: number;
};
export type BookedProduct = {
  price?: number | null;
  product_id: number;
  quantity?: number | null;
};
export type CompletedSaleProducts = {
  booked_at: string;
  cashier_id: number;
  customer_account_id: number | null;
  id: number;
  line_items: PendingLineItem[];
  new_balance: number;
  new_voucher_balance: number;
  old_balance: number;
  old_voucher_balance: number;
  payment_method: PaymentMethod;
  products: BookedProduct[];
  till_id: number;
  uuid: string;
};
export type CompletedSaleProductsRead = {
  booked_at: string;
  cashier_id: number;
  customer_account_id: number | null;
  id: number;
  item_count: number;
  line_items: PendingLineItemRead[];
  new_balance: number;
  new_voucher_balance: number;
  old_balance: number;
  old_voucher_balance: number;
  payment_method: PaymentMethod;
  products: BookedProduct[];
  till_id: number;
  total_price: number;
  used_vouchers: number;
  uuid: string;
};
export type EditSaleProducts = {
  products: BookedProduct[];
  used_vouchers?: number | null;
  uuid: string;
};
export type PayoutRunWithStats = {
  created_at: string;
  created_by: number | null;
  done: boolean;
  id: number;
  n_payouts: number;
  node_id: number;
  revoked: boolean;
  sepa_was_generated: boolean;
  set_done_at: string | null;
  set_done_by: number | null;
  total_donation_amount: number;
  total_payout_amount: number;
};
export type NormalizedListPayoutRunWithStatsInt = {
  entities: {
    [key: string]: PayoutRunWithStats;
  };
  ids: number[];
};
export type NewPayoutRun = {
  max_num_payouts: number;
  max_payout_sum: number;
};
export type PendingPayoutDetail = {
  n_payouts: number;
  total_donation_amount: number;
  total_payout_amount: number;
};
export type CreateSepaXmlPayload = {
  execution_date: string;
};
export type NormalizedListProductInt = {
  entities: {
    [key: string]: Product;
  };
  ids: number[];
};
export type Config = {
  sumup_topup_enabled_globally: boolean;
  terminal_api_endpoint: string;
  test_mode: boolean;
  test_mode_message: string;
};
export type StatInterval = {
  count: number;
  from_time: string;
  revenue: number;
  to_time: string;
};
export type TimeseriesStats = {
  daily_intervals: StatInterval[];
  from_time: string;
  hourly_intervals: StatInterval[];
  to_time: string;
};
export type ProductTimeseries = {
  intervals: StatInterval[];
  product_id: number;
  product_name: string;
};
export type ProductOverallStats = {
  count: number;
  product_id: number;
  product_name: string;
  revenue: number;
};
export type ProductStats = {
  daily_intervals: StatInterval[];
  deposit_hourly_intervals: ProductTimeseries[];
  deposit_overall_stats: ProductOverallStats[];
  from_time: string;
  hourly_intervals: StatInterval[];
  product_hourly_intervals: ProductTimeseries[];
  product_overall_stats: ProductOverallStats[];
  to_time: string;
};
export type VoucherStats = {
  vouchers_issued: number;
  vouchers_spent: number;
};
export type SumUpCheckoutStatus = "PENDING" | "FAILED" | "PAID";
export type SumUpTransaction = {
  amount: number;
  card_type?: string | null;
  currency: string;
  id: string;
  payment_type?: string | null;
  product_summary?: string | null;
  status: string;
  timestamp: string;
  transaction_code: string;
  type?: string | null;
};
export type SumUpCheckout = {
  amount: number;
  checkout_reference: string;
  currency: string;
  date: string;
  description: string;
  id: string;
  merchant_code: string;
  redirect_url: string;
  status: SumUpCheckoutStatus;
  transaction_code?: string | null;
  transaction_id?: string | null;
  transactions?: SumUpTransaction[];
  valid_until?: string | null;
};
export type NormalizedListTaxRateInt = {
  entities: {
    [key: string]: TaxRate;
  };
  ids: number[];
};
export type NewTaxRate = {
  description: string;
  name: string;
  rate: number;
};
export type NormalizedListTerminalInt = {
  entities: {
    [key: string]: Terminal;
  };
  ids: number[];
};
export type TerminalUserLoginPayload = {
  role_id: number;
  user_id: number;
};
export type SwitchTillPayload = {
  new_till_id: number;
};
export type Ticket = {
  id: number;
  initial_top_up_amount: number;
  is_locked: boolean;
  name: string;
  node_id: number;
  price: number;
  restrictions: ProductRestriction[];
  tax_name: string;
  tax_rate: number;
  tax_rate_id: number;
  total_price: number;
};
export type NormalizedListTicketInt = {
  entities: {
    [key: string]: Ticket;
  };
  ids: number[];
};
export type NewTicket = {
  initial_top_up_amount: number;
  is_locked: boolean;
  name: string;
  price: number;
  restrictions: ProductRestriction[];
  tax_rate_id: number;
};
export type NormalizedListTillButtonInt = {
  entities: {
    [key: string]: TillButton;
  };
  ids: number[];
};
export type NormalizedListTillLayoutInt = {
  entities: {
    [key: string]: TillLayout;
  };
  ids: number[];
};
export type NormalizedListTillProfileInt = {
  entities: {
    [key: string]: TillProfile;
  };
  ids: number[];
};
export type NewTillProfile = {
  allow_cash_out: boolean;
  allow_ticket_sale: boolean;
  allow_ticket_vouchers: boolean;
  allow_top_up: boolean;
  description?: string | null;
  enable_card_payment: boolean;
  enable_cash_payment: boolean;
  enable_ssp_payment: boolean;
  layout_id: number;
  name: string;
};
export type CashRegisterStocking = {
  cent1?: number;
  cent10?: number;
  cent2?: number;
  cent20?: number;
  cent5?: number;
  cent50?: number;
  euro1?: number;
  euro10?: number;
  euro100?: number;
  euro2?: number;
  euro20?: number;
  euro200?: number;
  euro5?: number;
  euro50?: number;
  id: number;
  name: string;
  node_id: number;
  total: number;
  variable_in_euro?: number;
};
export type NormalizedListCashRegisterStockingInt = {
  entities: {
    [key: string]: CashRegisterStocking;
  };
  ids: number[];
};
export type NewCashRegisterStocking = {
  cent1?: number;
  cent10?: number;
  cent2?: number;
  cent20?: number;
  cent5?: number;
  cent50?: number;
  euro1?: number;
  euro10?: number;
  euro100?: number;
  euro2?: number;
  euro20?: number;
  euro200?: number;
  euro5?: number;
  euro50?: number;
  name: string;
  variable_in_euro?: number;
};
export type NormalizedListCashRegisterInt = {
  entities: {
    [key: string]: CashRegister;
  };
  ids: number[];
};
export type AssignRegisterPayload = {
  cash_register_id: number;
  cashier_id: number;
};
export type ModifyRegisterBalancePayload = {
  amount: number;
  cashier_id: number;
};
export type TransferRegisterPayload = {
  source_cashier_id: number;
  target_cashier_id: number;
};
export type Transaction = {
  amount: number;
  booked_at: string;
  conducting_user_id: number | null;
  description: string | null;
  id: number;
  order: Order | null;
  source_account: number;
  target_account: number;
  vouchers: number;
};
export type TransactionRead = {
  amount: number;
  booked_at: string;
  conducting_user_id: number | null;
  description: string | null;
  id: number;
  order: OrderRead | null;
  source_account: number;
  target_account: number;
  vouchers: number;
};
export type NormalizedListTransactionInt = {
  entities: {
    [key: string]: Transaction;
  };
  ids: number[];
};
export type NormalizedListTillInt = {
  entities: {
    [key: string]: Till;
  };
  ids: number[];
};
export type SwitchTerminalPayload = {
  new_terminal_id: number;
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
export type Language = "en-US" | "de-DE";
export type PublicEventSettings = {
  bon_address: string;
  bon_issuer: string;
  bon_title: string;
  currency_identifier: string;
  customer_portal_about_page_url: string;
  customer_portal_background_color?: string | null;
  customer_portal_banner_image_url?: string | null;
  customer_portal_contact_email: string;
  customer_portal_data_privacy_url: string;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_url: string;
  daily_end_time?: string | null;
  donation_enabled?: boolean;
  email_default_sender?: string | null;
  email_enabled: boolean;
  email_smtp_host?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  end_date?: string | null;
  id: number;
  languages: Language[];
  max_account_balance: number;
  payout_done_message?: string | null;
  payout_done_subject?: string | null;
  payout_registered_message?: string | null;
  payout_registered_subject?: string | null;
  payout_sender?: string | null;
  post_payment_allowed?: boolean;
  pretix_event: string | null;
  pretix_organizer: string | null;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_ticket_ids: number[] | null;
  sepa_allowed_country_codes: string[];
  sepa_description: string;
  sepa_enabled: boolean;
  sepa_max_num_payouts_in_run: number;
  sepa_sender_iban: string;
  sepa_sender_name: string;
  start_date?: string | null;
  sumup_payment_enabled: boolean;
  sumup_topup_enabled: boolean;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  ust_id: string;
  vip_max_account_balance?: number;
};
export type NodeSeenByUser = {
  children: NodeSeenByUser[];
  computed_forbidden_objects_at_node: ObjectType[];
  computed_forbidden_objects_in_subtree: ObjectType[];
  description: string;
  event: PublicEventSettings | null;
  event_node_id: number | null;
  forbidden_objects_at_node: ObjectType[];
  forbidden_objects_in_subtree: ObjectType[];
  id: number;
  name: string;
  parent: number;
  parent_ids: number[];
  parents_until_event_node: number[] | null;
  path: string;
  privileges_at_node: Privilege[];
  read_only: boolean;
};
export type BodyUploadEventBannerTreeEventsNodeIdBannerPost = {
  file: Blob;
};
export type Node = {
  children: Node[];
  computed_forbidden_objects_at_node: ObjectType[];
  computed_forbidden_objects_in_subtree: ObjectType[];
  description: string;
  event: PublicEventSettings | null;
  event_node_id: number | null;
  forbidden_objects_at_node: ObjectType[];
  forbidden_objects_in_subtree: ObjectType[];
  id: number;
  name: string;
  parent: number;
  parent_ids: number[];
  parents_until_event_node: number[] | null;
  path: string;
  read_only: boolean;
};
export type CopyEventOptions = {
  copy_account_balances?: boolean;
  copy_event_settings?: boolean;
  copy_products?: boolean;
  copy_sub_nodes?: boolean;
  copy_terminals?: boolean;
  copy_tills?: boolean;
  copy_tse_devices?: boolean;
  copy_user_tags?: boolean;
  copy_users?: boolean;
};
export type CopyEventRequest = {
  description: string;
  name: string;
  options: CopyEventOptions;
};
export type UpdateEvent = {
  bon_address: string;
  bon_issuer: string;
  bon_title: string;
  currency_identifier: string;
  customer_portal_about_page_url: string;
  customer_portal_background_color?: string | null;
  customer_portal_banner_image_url?: string | null;
  customer_portal_contact_email: string;
  customer_portal_data_privacy_url: string;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_url: string;
  daily_end_time?: string | null;
  donation_enabled?: boolean;
  email_default_sender?: string | null;
  email_enabled: boolean;
  email_smtp_host?: string | null;
  email_smtp_password?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  end_date?: string | null;
  max_account_balance: number;
  payout_done_message?: string | null;
  payout_done_subject?: string | null;
  payout_registered_message?: string | null;
  payout_registered_subject?: string | null;
  payout_sender?: string | null;
  post_payment_allowed?: boolean;
  pretix_api_key: string | null;
  pretix_event: string | null;
  pretix_organizer: string | null;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_ticket_ids: number[] | null;
  sepa_allowed_country_codes: string[];
  sepa_description: string;
  sepa_enabled: boolean;
  sepa_max_num_payouts_in_run?: number | null;
  sepa_sender_iban: string;
  sepa_sender_name: string;
  start_date?: string | null;
  sumup_affiliate_key?: string;
  sumup_api_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  sumup_payment_enabled: boolean;
  sumup_topup_enabled: boolean;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  ust_id: string;
  vip_max_account_balance?: number;
};
export type RestrictedEventSettings = {
  bon_address: string;
  bon_issuer: string;
  bon_title: string;
  currency_identifier: string;
  customer_portal_about_page_url: string;
  customer_portal_background_color?: string | null;
  customer_portal_banner_image_url?: string | null;
  customer_portal_contact_email: string;
  customer_portal_data_privacy_url: string;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_url: string;
  daily_end_time?: string | null;
  donation_enabled?: boolean;
  email_default_sender?: string | null;
  email_enabled: boolean;
  email_smtp_host?: string | null;
  email_smtp_password?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  end_date?: string | null;
  id: number;
  languages: Language[];
  max_account_balance: number;
  payout_done_message?: string | null;
  payout_done_subject?: string | null;
  payout_registered_message?: string | null;
  payout_registered_subject?: string | null;
  payout_sender?: string | null;
  post_payment_allowed?: boolean;
  pretix_api_key: string | null;
  pretix_event: string | null;
  pretix_organizer: string | null;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_ticket_ids: number[] | null;
  sepa_allowed_country_codes: string[];
  sepa_description: string;
  sepa_enabled: boolean;
  sepa_max_num_payouts_in_run: number;
  sepa_sender_iban: string;
  sepa_sender_name: string;
  start_date?: string | null;
  sumup_affiliate_key?: string;
  sumup_api_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  sumup_oauth_refresh_token: string;
  sumup_payment_enabled: boolean;
  sumup_topup_enabled: boolean;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  ust_id: string;
  vip_max_account_balance?: number;
};
export type SumUpTokenPayload = {
  authorization_code: string;
};
export type NewEvent = {
  bon_address: string;
  bon_issuer: string;
  bon_title: string;
  currency_identifier: string;
  customer_portal_about_page_url: string;
  customer_portal_background_color?: string | null;
  customer_portal_banner_image_url?: string | null;
  customer_portal_contact_email: string;
  customer_portal_data_privacy_url: string;
  customer_portal_primary_color?: string | null;
  customer_portal_secondary_color?: string | null;
  customer_portal_url: string;
  daily_end_time?: string | null;
  description: string;
  donation_enabled?: boolean;
  email_default_sender?: string | null;
  email_enabled: boolean;
  email_smtp_host?: string | null;
  email_smtp_password?: string | null;
  email_smtp_port?: number | null;
  email_smtp_username?: string | null;
  end_date?: string | null;
  forbidden_objects_at_node?: ObjectType[];
  forbidden_objects_in_subtree?: ObjectType[];
  max_account_balance: number;
  name: string;
  payout_done_message?: string | null;
  payout_done_subject?: string | null;
  payout_registered_message?: string | null;
  payout_registered_subject?: string | null;
  payout_sender?: string | null;
  post_payment_allowed?: boolean;
  pretix_api_key: string | null;
  pretix_event: string | null;
  pretix_organizer: string | null;
  pretix_presale_enabled: boolean;
  pretix_shop_url: string | null;
  pretix_ticket_ids: number[] | null;
  sepa_allowed_country_codes: string[];
  sepa_description: string;
  sepa_enabled: boolean;
  sepa_max_num_payouts_in_run?: number | null;
  sepa_sender_iban: string;
  sepa_sender_name: string;
  start_date?: string | null;
  sumup_affiliate_key?: string;
  sumup_api_key?: string;
  sumup_merchant_code?: string;
  sumup_oauth_client_id?: string;
  sumup_oauth_client_secret?: string;
  sumup_payment_enabled: boolean;
  sumup_topup_enabled: boolean;
  translation_texts?: {
    [key: string]: {
      [key: string]: string;
    };
  };
  ust_id: string;
  vip_max_account_balance?: number;
};
export type NewNode = {
  description: string;
  forbidden_objects_at_node?: ObjectType[];
  forbidden_objects_in_subtree?: ObjectType[];
  name: string;
};
export type TseStatus = "new" | "active" | "disabled" | "failed";
export type TseType = "diebold_nixdorf";
export type Tse = {
  certificate: string | null;
  hashalgo: string | null;
  id: number;
  name: string;
  node_id: number;
  password: string;
  process_data_encoding: string | null;
  public_key: string | null;
  serial: string | null;
  status: TseStatus;
  time_format: string | null;
  type: TseType;
  ws_timeout: number;
  ws_url: string;
};
export type NormalizedListTseInt = {
  entities: {
    [key: string]: Tse;
  };
  ids: number[];
};
export type NewTse = {
  name: string;
  password: string;
  serial: string | null;
  type: TseType;
  ws_timeout: number;
  ws_url: string;
};
export type UpdateTse = {
  name: string;
  password: string;
  ws_timeout: number;
  ws_url: string;
};
export type UserRole = {
  id: number;
  is_privileged?: boolean;
  name: string;
  node_id: number;
  privileges: Privilege[];
};
export type NormalizedListUserRoleInt = {
  entities: {
    [key: string]: UserRole;
  };
  ids: number[];
};
export type NewUserRole = {
  is_privileged?: boolean;
  name: string;
  privileges: Privilege[];
};
export type UpdateUserRolePrivilegesPayload = {
  is_privileged: boolean;
  privileges: Privilege[];
};
export type UserTagSecret = {
  description: string;
  id: number;
  key0: string;
  key1: string;
  node_id: number;
};
export type NewUserTagSecret = {
  description: string;
  key0: string;
  key1: string;
};
export type NewUserTag = {
  comment?: string | null;
  group_tag?: string | null;
  is_vip?: boolean;
  pin: string;
  restriction?: ProductRestriction | null;
  secret_id: number;
  uid?: number | null;
};
export type UserTagAccountAssociation = {
  account_id: number;
  mapping_was_valid_until: string;
};
export type UserTagDetail = {
  account_history: UserTagAccountAssociation[];
  account_id?: number | null;
  comment?: string | null;
  group_tag?: string | null;
  id: number;
  is_vip?: boolean;
  node_id: number;
  pin: string;
  uid: number | null;
  user_id?: number | null;
};
export type NormalizedListUserTagDetailInt = {
  entities: {
    [key: string]: UserTagDetail;
  };
  ids: number[];
};
export type FindUserTagPayload = {
  search_term: string;
};
export type UpdateCommentPayload = {
  comment: string;
};
export type UpdateGroupTagPayload = {
  group_tag: string | null;
};
export type UpdateVipStatusPayload = {
  is_vip: boolean;
};
export type UserToRoles = {
  node_id: number;
  role_ids: number[];
  terminal_only?: boolean;
  user_id: number;
};
export type NewUserToRoles = {
  role_ids: number[];
  terminal_only?: boolean;
  user_id: number;
};
export type User = {
  description?: string | null;
  display_name: string;
  id: number;
  login: string;
  node_id: number;
  transport_account_id?: number | null;
  user_tag_id?: number | null;
  user_tag_pin?: string | null;
  user_tag_uid?: number | null;
};
export type UserRead = {
  description?: string | null;
  display_name: string;
  id: number;
  login: string;
  node_id: number;
  transport_account_id?: number | null;
  user_tag_id?: number | null;
  user_tag_pin?: string | null;
  user_tag_uid?: number | null;
  user_tag_uid_hex: string | null;
};
export type NormalizedListUserInt = {
  entities: {
    [key: string]: User;
  };
  ids: number[];
};
export type CreateUserPayload = {
  description?: string | null;
  display_name: string;
  login: string;
  password?: string | null;
  user_tag_pin?: string | null;
  user_tag_uid_hex?: string | null;
};
export type UpdateUserPayload = {
  description?: string | null;
  display_name: string;
  login: string;
  user_tag_pin?: string | null;
  user_tag_uid_hex?: string | null;
};
export type ChangeUserPasswordPayload = {
  new_password: string;
};
export const {
  useFindAccountsMutation,
  useGetAccountQuery,
  useLazyGetAccountQuery,
  useDisableAccountMutation,
  useUpdateBalanceMutation,
  useUpdateAccountCommentMutation,
  useUpdateVoucherAmountMutation,
  useChangePasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useListCashiersQuery,
  useLazyListCashiersQuery,
  useGetCashierQuery,
  useLazyGetCashierQuery,
  useCloseOutCashierMutation,
  useGetCashierShiftStatsQuery,
  useLazyGetCashierShiftStatsQuery,
  useGetCashierShiftsQuery,
  useLazyGetCashierShiftsQuery,
  useListConfigEntriesQuery,
  useLazyListConfigEntriesQuery,
  useSetConfigEntryMutation,
  useFindCustomersMutation,
  useGetCustomerQuery,
  useLazyGetCustomerQuery,
  useAllowCustomerPayoutMutation,
  usePreventCustomerPayoutMutation,
  useListEntryAreasQuery,
  useLazyListEntryAreasQuery,
  useCreateEntryAreaMutation,
  useDeleteEntryAreaMutation,
  useGetEntryAreaQuery,
  useLazyGetEntryAreaQuery,
  useUpdateEntryAreaMutation,
  useListEntryAreaGroupsQuery,
  useLazyListEntryAreaGroupsQuery,
  useAssignEntryGroupToAreaMutation,
  useRemoveEntryGroupFromAreaMutation,
  useListEntryAreaGroupWindowsQuery,
  useLazyListEntryAreaGroupWindowsQuery,
  useCreateEntryAreaGroupWindowMutation,
  useDeleteEntryAreaGroupWindowMutation,
  useUpdateEntryAreaGroupWindowMutation,
  useListEntryGroupsQuery,
  useLazyListEntryGroupsQuery,
  useCreateEntryGroupMutation,
  useDeleteEntryGroupMutation,
  useGetEntryGroupQuery,
  useLazyGetEntryGroupQuery,
  useUpdateEntryGroupMutation,
  useListEntryGroupMembersQuery,
  useLazyListEntryGroupMembersQuery,
  useAddEntryGroupMemberMutation,
  useAddEntryGroupMembersByGroupTagMutation,
  useRemoveEntryGroupMemberMutation,
  useListEntryScanLogsQuery,
  useLazyListEntryScanLogsQuery,
  useExportEntryScanLogsQuery,
  useLazyExportEntryScanLogsQuery,
  useCreateCashRegisterLlmMutation,
  useListEventsLlmQuery,
  useLazyListEventsLlmQuery,
  useCreateProductLlmMutation,
  useListTaxRatesLlmQuery,
  useLazyListTaxRatesLlmQuery,
  useCreateTerminalLlmMutation,
  useListTillButtonsLlmQuery,
  useLazyListTillButtonsLlmQuery,
  useCreateTillButtonLlmMutation,
  useListTillLayoutsLlmQuery,
  useLazyListTillLayoutsLlmQuery,
  useCreateTillLayoutLlmMutation,
  useListTillProfilesLlmQuery,
  useLazyListTillProfilesLlmQuery,
  useCreateTillLlmMutation,
  useListLlmToolsQuery,
  useLazyListLlmToolsQuery,
  useListHeadwindDevicesQuery,
  useLazyListHeadwindDevicesQuery,
  useListMappingsQuery,
  useLazyListMappingsQuery,
  useCreateOrUpdateMappingMutation,
  useDeleteMappingMutation,
  useRefreshMappingTokenMutation,
  useListOrdersQuery,
  useLazyListOrdersQuery,
  useListOrdersByTillQuery,
  useLazyListOrdersByTillQuery,
  useCancelOrderMutation,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useGetOrderBonQuery,
  useLazyGetOrderBonQuery,
  useEditOrderMutation,
  useListPayoutRunsQuery,
  useLazyListPayoutRunsQuery,
  useCreatePayoutRunMutation,
  usePendingPayoutDetailQuery,
  useLazyPendingPayoutDetailQuery,
  usePayoutRunCsvExportMutation,
  usePayoutRunPayoutsQuery,
  useLazyPayoutRunPayoutsQuery,
  usePreviousPayoutRunSepaXmlMutation,
  useRevokePayoutRunMutation,
  usePayoutRunSepaXmlMutation,
  useSetPayoutRunAsDoneMutation,
  useListProductsQuery,
  useLazyListProductsQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductQuery,
  useLazyGetProductQuery,
  useUpdateProductMutation,
  useGetPublicConfigQuery,
  useLazyGetPublicConfigQuery,
  useGetEntryStatsQuery,
  useLazyGetEntryStatsQuery,
  useGetPayOutStatsQuery,
  useLazyGetPayOutStatsQuery,
  useGetProductStatsQuery,
  useLazyGetProductStatsQuery,
  useGetTopUpStatsQuery,
  useLazyGetTopUpStatsQuery,
  useGetVoucherStatsQuery,
  useLazyGetVoucherStatsQuery,
  useListSumupCheckoutsQuery,
  useLazyListSumupCheckoutsQuery,
  useGetSumupCheckoutQuery,
  useLazyGetSumupCheckoutQuery,
  useListSumupTransactionsQuery,
  useLazyListSumupTransactionsQuery,
  useListSystemAccountsQuery,
  useLazyListSystemAccountsQuery,
  useListTaxRatesQuery,
  useLazyListTaxRatesQuery,
  useCreateTaxRateMutation,
  useDeleteTaxRateMutation,
  useGetTaxRateQuery,
  useLazyGetTaxRateQuery,
  useUpdateTaxRateMutation,
  useListTerminalsQuery,
  useLazyListTerminalsQuery,
  useCreateTerminalMutation,
  useDeleteTerminalMutation,
  useGetTerminalQuery,
  useLazyGetTerminalQuery,
  useUpdateTerminalMutation,
  useForceLogoutUserMutation,
  useLoginUserMutation,
  useLogoutTerminalMutation,
  useSwitchTillMutation,
  useListTicketsQuery,
  useLazyListTicketsQuery,
  useCreateTicketMutation,
  useDeleteTicketMutation,
  useGetTicketQuery,
  useLazyGetTicketQuery,
  useUpdateTicketMutation,
  useListTillButtonsQuery,
  useLazyListTillButtonsQuery,
  useCreateTillButtonMutation,
  useDeleteTillButtonMutation,
  useGetTillButtonQuery,
  useLazyGetTillButtonQuery,
  useUpdateTillButtonMutation,
  useListTillLayoutsQuery,
  useLazyListTillLayoutsQuery,
  useCreateTillLayoutMutation,
  useDeleteTillLayoutMutation,
  useGetTillLayoutQuery,
  useLazyGetTillLayoutQuery,
  useUpdateTillLayoutMutation,
  useListTillProfilesQuery,
  useLazyListTillProfilesQuery,
  useCreateTillProfileMutation,
  useDeleteTillProfileMutation,
  useGetTillProfileQuery,
  useLazyGetTillProfileQuery,
  useUpdateTillProfileMutation,
  useListRegisterStockingsQuery,
  useLazyListRegisterStockingsQuery,
  useCreateRegisterStockingMutation,
  useDeleteRegisterStockingMutation,
  useUpdateRegisterStockingMutation,
  useListCashRegistersAdminQuery,
  useLazyListCashRegistersAdminQuery,
  useCreateRegisterMutation,
  useAssignRegisterMutation,
  useModifyRegisterBalanceMutation,
  useTransferRegisterMutation,
  useDeleteRegisterMutation,
  useGetCashRegisterAdminQuery,
  useLazyGetCashRegisterAdminQuery,
  useUpdateRegisterMutation,
  useGetCashierShiftsForRegisterQuery,
  useLazyGetCashierShiftsForRegisterQuery,
  useListTransactionsQuery,
  useLazyListTransactionsQuery,
  useListTillsQuery,
  useLazyListTillsQuery,
  useCreateTillMutation,
  useDeleteTillMutation,
  useGetTillQuery,
  useLazyGetTillQuery,
  useUpdateTillMutation,
  useRemoveFromTerminalMutation,
  useSwitchTerminalMutation,
  useGetTransactionQuery,
  useLazyGetTransactionQuery,
  useGetTreeForCurrentUserQuery,
  useLazyGetTreeForCurrentUserQuery,
  useDeleteEventBannerMutation,
  useGetEventBannerQuery,
  useLazyGetEventBannerQuery,
  useUploadEventBannerMutation,
  useCopyEventMutation,
  useUpdateEventMutation,
  useGenerateTestBonMutation,
  useGenerateTestReportMutation,
  useGetRestrictedEventSettingsQuery,
  useLazyGetRestrictedEventSettingsQuery,
  useDeleteNodeMutation,
  useArchiveNodeMutation,
  useConfigureSumupTokenMutation,
  useCreateEventMutation,
  useCreateNodeMutation,
  useGenerateRevenueReportMutation,
  useUpdateNodeMutation,
  useListTsesQuery,
  useLazyListTsesQuery,
  useCreateTseMutation,
  useUpdateTseMutation,
  useListUserRolesQuery,
  useLazyListUserRolesQuery,
  useCreateUserRoleMutation,
  useDeleteUserRoleMutation,
  useUpdateUserRoleMutation,
  useListUserTagSecretsQuery,
  useLazyListUserTagSecretsQuery,
  useCreateUserTagSecretMutation,
  useCreateUserTagsMutation,
  useFindUserTagsMutation,
  useGetUserTagDetailQuery,
  useLazyGetUserTagDetailQuery,
  useUpdateUserTagCommentMutation,
  useUpdateUserTagGroupTagMutation,
  useUpdateUserTagVipStatusMutation,
  useListUserToRoleQuery,
  useLazyListUserToRoleQuery,
  useUpdateUserToRolesMutation,
  useListUsersQuery,
  useLazyListUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUserQuery,
  useLazyGetUserQuery,
  useUpdateUserMutation,
  useChangeUserPasswordMutation,
} = injectedRtkApi;
