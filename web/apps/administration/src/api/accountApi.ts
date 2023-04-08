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
    getAccounts: builder.query<EntityState<Account>, void>({
      query: () => "/accounts/",
      transformResponse: (response: Account[]) => {
        return accountAdapter.addMany(accountAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "account" as const, id })), "account"] : ["account"],
    }),
  }),
});

export const { selectAccountAll, selectAccountById, selectAccountEntities, selectAccountIds, selectAccountTotal } =
  convertEntityAdaptorSelectors("account", accountAdapter.getSelectors());

export const { useGetAccountsQuery } = accountApi;
