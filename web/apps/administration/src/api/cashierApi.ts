import { createApi } from "@reduxjs/toolkit/query/react";
import { Cashier, CashierCloseOutResult, CashierShift, NewCashierCloseOut } from "@models/cashiers";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const cashierAdapter = createEntityAdapter<Cashier>({
  sortComparer: (a, b) => a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase()),
});

export const cashierApi = createApi({
  reducerPath: "cashierApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["cashier", "cashierShift"],
  endpoints: (builder) => ({
    getCashiers: builder.query<EntityState<Cashier>, void>({
      query: () => "/cashiers/",
      transformResponse: (response: Cashier[]) => {
        return cashierAdapter.addMany(cashierAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "cashier" as const, id })), "cashier"] : ["cashier"],
    }),
    getCashierById: builder.query<EntityState<Cashier>, number>({
      query: (id) => `/cashiers/${id}/`,
      transformResponse: (response: Cashier) => {
        return cashierAdapter.addOne(cashierAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["cashier", { type: "cashier" as const, id: arg }],
    }),
    getCashierShifts: builder.query<CashierShift[], number>({
      query: (id) => `/cashiers/${id}/shifts`,
      providesTags: (result, error, arg) => [{ type: "cashierShift" as const, cashierId: arg }],
    }),
    closeOutCashier: builder.mutation<CashierCloseOutResult, NewCashierCloseOut>({
      query: (closeOut) => ({ url: `/cashiers/${closeOut.cashier_id}/close-out`, method: "POST", body: closeOut }),
      invalidatesTags: ["cashier", "cashierShift"],
    }),
  }),
});

export const { selectCashierAll, selectCashierById, selectCashierEntities, selectCashierIds, selectCashierTotal } =
  convertEntityAdaptorSelectors("Cashier", cashierAdapter.getSelectors());

export const { useGetCashiersQuery, useGetCashierByIdQuery, useGetCashierShiftsQuery, useCloseOutCashierMutation } =
  cashierApi;
