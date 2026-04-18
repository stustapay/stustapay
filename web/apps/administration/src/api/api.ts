import { createEntityAdapter } from "@reduxjs/toolkit";
import {
  AccountRead,
  CashRegister,
  CashRegisterStocking,
  CashierRead,
  CashierShift,
  Order,
  PayoutRunWithStats,
  Product,
  TaxRate,
  Ticket,
  Till,
  TillButton,
  TillLayout,
  TillProfile,
  Tse,
  User,
  UserRole,
  UserTagDetail,
  EntryArea,
  EntryGroup,
  api as generatedApi,
  GenerateTestBonApiArg,
  GenerateTestReportApiArg,
  Terminal,
  GenerateRevenueReportApiArg,
  UpdateUserTagCommentApiArg,
  UpdateUserTagVipStatusApiArg,
  UpdateUserTagAccountCreationBlockedApiArg,
  FindCustomerTagSwapCandidatesApiArg,
  SwapCustomerTagApiArg,
  Transaction,
} from "./generated/api";
import { Account, Cashier } from "@stustapay/models";
import { convertEntityAdaptorSelectors, generateCacheKeys } from "./utils";

export * from "./generated/api";

const userAdapter = createEntityAdapter<User>({
  sortComparer: (a, b) => a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
});

const accountAdapter = createEntityAdapter<Account>({
  sortComparer: (a, b) => (a.name?.toLowerCase() ?? "").localeCompare(b.name?.toLowerCase() ?? ""),
});

const userTagAdapter = createEntityAdapter<UserTagDetail>({
  sortComparer: (a, b) => a.pin.toLowerCase().localeCompare(b.pin.toLowerCase()),
});

const userRoleAdapter = createEntityAdapter<UserRole>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const productAdapter = createEntityAdapter<Product>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const cashierAdapter = createEntityAdapter<Cashier>({
  sortComparer: (a, b) => a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase()),
});

const cashierShiftAdapter = createEntityAdapter<CashierShift>({
  sortComparer: (a, b) => a.ended_at.localeCompare(b.ended_at),
});

const orderAdapter = createEntityAdapter<Order>({ sortComparer: (a, b) => b.id - a.id });

const transactionAdapter = createEntityAdapter<Transaction>({ sortComparer: (a, b) => b.id - a.id });

const taxRateAdapter = createEntityAdapter<TaxRate>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const ticketAdapter = createEntityAdapter<Ticket>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const tillAdapter = createEntityAdapter<Till>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const tillLayoutAdapter = createEntityAdapter<TillLayout>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const tillButtonAdapter = createEntityAdapter<TillButton>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const tillProfileAdapter = createEntityAdapter<TillProfile>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const cashRegisterAdapter = createEntityAdapter<CashRegister>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const cashRegisterStockingAdapter = createEntityAdapter<CashRegisterStocking>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const tseAdapter = createEntityAdapter<Tse>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const payoutRunAdaptor = createEntityAdapter<PayoutRunWithStats>({
  sortComparer: (a, b) => a.created_at.toLowerCase().localeCompare(b.created_at.toLowerCase()),
});

const terminalAdapter = createEntityAdapter<Terminal>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const entryAreaAdapter = createEntityAdapter<EntryArea>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

const entryGroupAdapter = createEntityAdapter<EntryGroup>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const api = generatedApi.enhanceEndpoints({
  addTagTypes: [
    "config",
    "sumup-config",
    "node-sumup-link",
    "event-settings",
    "tag",
    "headwind-devices",
    "headwind-mappings",
    "entry-areas",
    "entry-groups",
  ],
  endpoints: {
    listUsers: {
      providesTags: (result) => generateCacheKeys("users", result),
    },
    getUser: {
      providesTags: (result, error, arg) => [{ type: "users", id: arg.userId }],
    },
    listUserRoles: {
      providesTags: (result) => generateCacheKeys("user-roles", result),
    },
    listProducts: {
      providesTags: (result) => generateCacheKeys("products", result),
    },
    getProduct: {
      providesTags: (result, error, arg) => [{ type: "products", id: arg.productId }],
    },
    listCashiers: {
      providesTags: (result) => generateCacheKeys("cashiers", result),
    },
    listConfigEntries: {
      providesTags: (result) => generateCacheKeys("config", result),
    },
    getGlobalSumupConfig: {
      providesTags: ["sumup-config"],
    },
    updateGlobalSumupConfig: {
      invalidatesTags: ["sumup-config", "node-sumup-link"],
    },
    getNodeSumupLinkStatus: {
      providesTags: (result, error, arg) => [{ type: "node-sumup-link", id: arg.nodeId }],
    },
    deleteNodeSumupLink: {
      invalidatesTags: (result, error, arg) => [{ type: "node-sumup-link", id: arg.nodeId }],
    },
    configureSumupToken: {
      invalidatesTags: (result, error, arg) => [{ type: "node-sumup-link", id: arg.nodeId }],
    },
    getRestrictedEventSettings: {
      providesTags: (result, error, arg) => [{ type: "event-settings", id: arg.nodeId }],
    },
    updateEvent: {
      invalidatesTags: (result, error, arg) => [{ type: "event-settings", id: arg.nodeId }],
    },
    clearLegacySumupSettings: {
      invalidatesTags: (result, error, arg) => [{ type: "event-settings", id: arg.nodeId }],
    },
    listTaxRates: {
      providesTags: (result) => generateCacheKeys("tax-rates", result),
    },
    getTaxRate: {
      providesTags: (result, error, arg) => [{ type: "tax-rates", id: arg.taxRateId }],
    },
    listTickets: {
      providesTags: (result) => generateCacheKeys("tickets", result),
    },
    getTicket: {
      providesTags: (result, error, arg) => [{ type: "tickets", id: arg.ticketId }],
    },
    listTills: {
      providesTags: (result) => generateCacheKeys("tills", result),
    },
    getTill: {
      providesTags: (result, error, arg) => [{ type: "tills", id: arg.tillId }],
    },
    listTillButtons: {
      providesTags: (result) => generateCacheKeys("till-buttons", result),
    },
    getTillButton: {
      providesTags: (result, error, arg) => [{ type: "till-buttons", id: arg.buttonId }],
    },
    listTillLayouts: {
      providesTags: (result) => generateCacheKeys("till-layouts", result),
    },
    getTillLayout: {
      providesTags: (result, error, arg) => [{ type: "till-layouts", id: arg.layoutId }],
    },
    listTillProfiles: {
      providesTags: (result) => generateCacheKeys("till-profiles", result),
    },
    getTillProfile: {
      providesTags: (result, error, arg) => [{ type: "till-profiles", id: arg.profileId }],
    },
    listTerminals: {
      providesTags: (result) => generateCacheKeys("terminals", result),
    },
    getTerminal: {
      providesTags: (result, error, arg) => [{ type: "terminals", id: arg.terminalId }],
    },
    listEntryAreas: {
      providesTags: (result) => generateCacheKeys("entry-areas", result),
    },
    listEntryGroups: {
      providesTags: (result) => generateCacheKeys("entry-groups", result),
    },
    listTses: {
      providesTags: (result) => generateCacheKeys("tses", result),
    },
    listPayoutRuns: {
      providesTags: (result) => generateCacheKeys("payouts", result),
    },
    generateTestReport: {
      query: (queryArg: GenerateTestReportApiArg) => ({
        url: `/tree/events/${queryArg.nodeId}/generate-test-report`,
        method: "POST",
        responseHandler: async (resp: Response) => {
          const blob = await resp.blob();
          return window.URL.createObjectURL(blob);
        },
      }),
      invalidatesTags: [],
    },
    generateRevenueReport: {
      query: (queryArg: GenerateRevenueReportApiArg) => ({
        url: `/tree/nodes/${queryArg.nodeId}/generate-revenue-report`,
        method: "POST",
        responseHandler: async (resp: Response) => {
          const blob = await resp.blob();
          return window.URL.createObjectURL(blob);
        },
      }),
      invalidatesTags: [],
    },
    updateUserTagComment: {
      query: ({ userTagId, nodeId, updateCommentPayload }: UpdateUserTagCommentApiArg) => ({
        url: `/user-tags/${userTagId}/update-comment`,
        method: "POST",
        body: { comment: updateCommentPayload.comment },
        params: { node_id: nodeId },
      }),
      invalidatesTags: [{ type: "user_tags", id: "LIST" }],
    },
    updateUserTagVipStatus: {
      query: ({ userTagId, nodeId, updateVipStatusPayload }: UpdateUserTagVipStatusApiArg) => ({
        url: `/user-tags/${userTagId}/update-vip-status`,
        method: "POST",
        body: { is_vip: updateVipStatusPayload.is_vip },
        params: { node_id: nodeId },
      }),
      invalidatesTags: (result, error, { userTagId }) => [
        { type: "user_tags", id: "LIST" },
        { type: "user_tags", id: userTagId }
      ],
    },
    updateUserTagAccountCreationBlocked: {
      query: ({
        userTagId,
        nodeId,
        updateAccountCreationBlockedPayload,
      }: UpdateUserTagAccountCreationBlockedApiArg) => ({
        url: `/user-tags/${userTagId}/update-account-creation-blocked`,
        method: "POST",
        body: { account_creation_blocked: updateAccountCreationBlockedPayload.account_creation_blocked },
        params: { node_id: nodeId },
      }),
      invalidatesTags: (result, error, { userTagId }) => [
        { type: "user_tags", id: "LIST" },
        { type: "user_tags", id: userTagId },
      ],
    },
    getUserTagDetail: {
      providesTags: (result, error, arg) => [
        { type: "user_tags", id: "LIST" },
        { type: "user_tags", id: arg.userTagId }
      ],
    },
    findCustomerTagSwapCandidates: {
      query: ({ nodeId, findTagSwapCandidatesPayload }: FindCustomerTagSwapCandidatesApiArg) => ({
        url: `/customers/tag-swap/find-tags`,
        method: "POST",
        body: findTagSwapCandidatesPayload,
        params: { node_id: nodeId },
      }),
      invalidatesTags: [],
    },
    swapCustomerTag: {
      query: ({ nodeId, swapCustomerTagPayload }: SwapCustomerTagApiArg) => ({
        url: `/customers/tag-swap`,
        method: "POST",
        body: swapCustomerTagPayload,
        params: { node_id: nodeId },
      }),
      invalidatesTags: ["accounts", "user_tags", "orders", "payouts"],
    },
  },
});

export const { selectUserAll, selectUserById, selectUserEntities, selectUserIds, selectUserTotal } =
  convertEntityAdaptorSelectors("User", userAdapter.getSelectors());

export const { selectUserRoleAll, selectUserRoleById, selectUserRoleEntities, selectUserRoleIds, selectUserRoleTotal } =
  convertEntityAdaptorSelectors("UserRole", userRoleAdapter.getSelectors());

export const { selectProductAll, selectProductById, selectProductEntities, selectProductIds, selectProductTotal } =
  convertEntityAdaptorSelectors("Product", productAdapter.getSelectors());

export const { selectCashierAll, selectCashierById, selectCashierEntities, selectCashierIds, selectCashierTotal } =
  convertEntityAdaptorSelectors("Cashier", cashierAdapter.getSelectors());

export const {
  selectCashierShiftAll,
  selectCashierShiftById,
  selectCashierShiftEntities,
  selectCashierShiftIds,
  selectCashierShiftTotal,
} = convertEntityAdaptorSelectors("CashierShift", cashierShiftAdapter.getSelectors());

export const { selectOrderAll, selectOrderById, selectOrderEntities, selectOrderIds, selectOrderTotal } =
  convertEntityAdaptorSelectors("Order", orderAdapter.getSelectors());

export const {
  selectTransactionAll,
  selectTransactionById,
  selectTransactionEntities,
  selectTransactionIds,
  selectTransactionTotal,
} = convertEntityAdaptorSelectors("Transaction", transactionAdapter.getSelectors());

export const { selectTaxRateAll, selectTaxRateById, selectTaxRateEntities, selectTaxRateIds, selectTaxRateTotal } =
  convertEntityAdaptorSelectors("TaxRate", taxRateAdapter.getSelectors());

export const { selectTicketAll, selectTicketById, selectTicketEntities, selectTicketIds, selectTicketTotal } =
  convertEntityAdaptorSelectors("Ticket", ticketAdapter.getSelectors());

export const { selectTillAll, selectTillById, selectTillEntities, selectTillIds, selectTillTotal } =
  convertEntityAdaptorSelectors("Till", tillAdapter.getSelectors());

export const {
  selectTillLayoutAll,
  selectTillLayoutById,
  selectTillLayoutEntities,
  selectTillLayoutIds,
  selectTillLayoutTotal,
} = convertEntityAdaptorSelectors("TillLayout", tillLayoutAdapter.getSelectors());

export const {
  selectTillButtonAll,
  selectTillButtonById,
  selectTillButtonEntities,
  selectTillButtonIds,
  selectTillButtonTotal,
} = convertEntityAdaptorSelectors("TillButton", tillButtonAdapter.getSelectors());

export const {
  selectTillProfileAll,
  selectTillProfileById,
  selectTillProfileEntities,
  selectTillProfileIds,
  selectTillProfileTotal,
} = convertEntityAdaptorSelectors("TillProfile", tillProfileAdapter.getSelectors());

export const {
  selectCashRegisterAll,
  selectCashRegisterById,
  selectCashRegisterEntities,
  selectCashRegisterIds,
  selectCashRegisterTotal,
} = convertEntityAdaptorSelectors("CashRegister", cashRegisterAdapter.getSelectors());

export const {
  selectCashRegisterStockingAll,
  selectCashRegisterStockingById,
  selectCashRegisterStockingEntities,
  selectCashRegisterStockingIds,
  selectCashRegisterStockingTotal,
} = convertEntityAdaptorSelectors("CashRegisterStocking", cashRegisterStockingAdapter.getSelectors());

export const { selectAccountById, selectAccountEntities, selectAccountTotal, selectAccountIds, selectAccountAll } =
  convertEntityAdaptorSelectors("Account", accountAdapter.getSelectors());

export const { selectUserTagAll, selectUserTagEntities, selectUserTagTotal, selectUserTagIds, selectUserTagById } =
  convertEntityAdaptorSelectors("UserTag", userTagAdapter.getSelectors());

export const { selectTseAll, selectTseById, selectTseEntities, selectTseIds, selectTseTotal } =
  convertEntityAdaptorSelectors("Tse", tseAdapter.getSelectors());

export const { selectTerminalAll, selectTerminalById, selectTerminalEntities, selectTerminalIds, selectTerminalTotal } =
  convertEntityAdaptorSelectors("Terminal", terminalAdapter.getSelectors());

export const {
  selectEntryAreaAll,
  selectEntryAreaById,
  selectEntryAreaEntities,
  selectEntryAreaIds,
  selectEntryAreaTotal,
} = convertEntityAdaptorSelectors("EntryArea", entryAreaAdapter.getSelectors());

export const {
  selectEntryGroupAll,
  selectEntryGroupById,
  selectEntryGroupEntities,
  selectEntryGroupIds,
  selectEntryGroupTotal,
} = convertEntityAdaptorSelectors("EntryGroup", entryGroupAdapter.getSelectors());

export const {
  selectPayoutRunAll,
  selectPayoutRunById,
  selectPayoutRunEntities,
  selectPayoutRunIds,
  selectPayoutRunTotal,
} = convertEntityAdaptorSelectors("PayoutRun", payoutRunAdaptor.getSelectors());
