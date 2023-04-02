import { createApi } from "@reduxjs/toolkit/query/react";
import { Cashier } from "@models/cashiers";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const cashierAdapter = createEntityAdapter<Cashier>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const cashierApi = createApi({
  reducerPath: "cashierApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["cashier"],
  endpoints: (builder) => ({
    getCashiers: builder.query<EntityState<Cashier>, void>({
      query: () => "/cashiers/",
      transformResponse: (response: Cashier[]) => {
        return cashierAdapter.addMany(cashierAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "cashier" as const, id })), "cashier"] : ["cashier"],
    }),
  }),
});

export const { selectCashierAll, selectCashierById, selectCashierEntities, selectCashierIds, selectCashierTotal } =
  convertEntityAdaptorSelectors("Cashier", cashierAdapter.getSelectors());

export const { useGetCashiersQuery } = cashierApi;
