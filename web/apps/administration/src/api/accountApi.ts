import { createApi } from "@reduxjs/toolkit/query/react";
import { Account } from "@models/account";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const accountAdapter = createEntityAdapter<Account>();

export const accountApi = createApi({
  reducerPath: "accountApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["account"],
  endpoints: (builder) => ({
    getSystemAccounts: builder.query<EntityState<Account>, void>({
      query: () => "/system-accounts/",
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
    findAccounts: builder.mutation<Account[], string>({
      query: (searchTerm) => ({ url: "/accounts/find-accounts/", method: "POST", body: { search_term: searchTerm } }),
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
} = accountApi;
