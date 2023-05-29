import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { Account, UserTagDetail } from "@stustapay/models";

const accountAdapter = createEntityAdapter<Account>();

export const accountApi = createApi({
  reducerPath: "accountApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["account", "userTag"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getSystemAccounts: builder.query<EntityState<Account>, void>({
      query: () => "/system-accounts",
      transformResponse: (response: Account[]) => {
        return accountAdapter.addMany(accountAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "account" as const, id })), "account"] : ["account"],
    }),
    getAccountById: builder.query<EntityState<Account>, number>({
      query: (id) => `/accounts/${id}`,
      transformResponse: (response: Account) => {
        return accountAdapter.addOne(accountAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "account" as const, id })), "account"] : ["account"],
    }),
    getUserTagDetail: builder.query<UserTagDetail, string>({
      query: (uid) => `/user-tags/${uid}`,
      providesTags: (result) =>
        result ? [{ type: "userTag" as const, id: result.user_tag_uid_hex }, "userTag"] : ["userTag"],
    }),
    findAccounts: builder.mutation<Account[], string>({
      query: (searchTerm) => ({ url: "/accounts/find-accounts", method: "POST", body: { search_term: searchTerm } }),
    }),
    disableAccount: builder.mutation<void, { accountId: number }>({
      query: ({ accountId }) => ({
        url: `/accounts/${accountId}/disable`,
        method: "POST",
      }),
      invalidatesTags: ["account"],
    }),
    updateBalance: builder.mutation<void, { accountId: number; newBalance: number }>({
      query: ({ accountId, newBalance }) => ({
        url: `/accounts/${accountId}/update-balance`,
        method: "POST",
        body: { new_balance: newBalance },
      }),
      invalidatesTags: ["account"],
    }),
    updateVoucherAmount: builder.mutation<void, { accountId: number; newVoucherAmount: number }>({
      query: ({ accountId, newVoucherAmount }) => ({
        url: `/accounts/${accountId}/update-voucher-amount`,
        method: "POST",
        body: { new_voucher_amount: newVoucherAmount },
      }),
      invalidatesTags: ["account"],
    }),
    updateTagUid: builder.mutation<void, { accountId: number; newTagUidHex: string; comment: string }>({
      query: ({ accountId, newTagUidHex, comment }) => ({
        url: `/accounts/${accountId}/update-tag-uid`,
        method: "POST",
        body: { new_tag_uid_hex: newTagUidHex, comment },
      }),
      invalidatesTags: ["account"],
    }),
    updateAccountComment: builder.mutation<void, { accountId: number; comment: string }>({
      query: ({ accountId, comment }) => ({
        url: `/accounts/${accountId}/update-comment`,
        method: "POST",
        body: { comment },
      }),
      invalidatesTags: ["account"],
    }),
    updateUserTagComment: builder.mutation<void, { userTagUidHex: string; comment: string }>({
      query: ({ userTagUidHex, comment }) => ({
        url: `/user-tags/${userTagUidHex}/update-comment`,
        method: "POST",
        body: { comment },
      }),
      invalidatesTags: ["userTag"],
    }),
  }),
});

export const { selectAccountAll, selectAccountById, selectAccountEntities, selectAccountIds, selectAccountTotal } =
  convertEntityAdaptorSelectors("account", accountAdapter.getSelectors());

export const {
  useGetSystemAccountsQuery,
  useGetAccountByIdQuery,
  useFindAccountsMutation,
  useUpdateBalanceMutation,
  useUpdateVoucherAmountMutation,
  useUpdateTagUidMutation,
  useDisableAccountMutation,
  useGetUserTagDetailQuery,
  useUpdateAccountCommentMutation,
  useUpdateUserTagCommentMutation,
} = accountApi;
