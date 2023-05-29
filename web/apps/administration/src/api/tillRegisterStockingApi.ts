import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewTillRegisterStocking, TillRegisterStocking } from "@stustapay/models";

const tillRegisterStockingAdapter = createEntityAdapter<TillRegisterStocking>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const tillRegisterStockingApi = createApi({
  reducerPath: "tillRegisterStockingApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["till-register-stockings"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTillRegisterStockings: builder.query<EntityState<TillRegisterStocking>, void>({
      query: () => "/till-register-stockings",
      transformResponse: (response: TillRegisterStocking[]) => {
        return tillRegisterStockingAdapter.addMany(tillRegisterStockingAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result
          ? [...result.ids.map((id) => ({ type: "till-register-stockings" as const, id })), "till-register-stockings"]
          : ["till-register-stockings"],
    }),
    createTillRegisterStocking: builder.mutation<TillRegisterStocking, NewTillRegisterStocking>({
      query: (till) => ({ url: "/till-register-stockings", method: "POST", body: till }),
      invalidatesTags: ["till-register-stockings"],
    }),
    updateTillRegisterStocking: builder.mutation<TillRegisterStocking, Omit<TillRegisterStocking, "total">>({
      query: ({ id, ...stocking }) => ({ url: `/till-register-stockings/${id}`, method: "POST", body: stocking }),
      invalidatesTags: ["till-register-stockings"],
    }),
    deleteTillRegisterStocking: builder.mutation<void, number>({
      query: (id) => ({ url: `/till-register-stockings/${id}`, method: "DELETE" }),
      invalidatesTags: ["till-register-stockings"],
    }),
  }),
});

export const {
  selectTillRegisterStockingAll,
  selectTillRegisterStockingById,
  selectTillRegisterStockingEntities,
  selectTillRegisterStockingIds,
  selectTillRegisterStockingTotal,
} = convertEntityAdaptorSelectors("TillRegisterStocking", tillRegisterStockingAdapter.getSelectors());

export const {
  useCreateTillRegisterStockingMutation,
  useDeleteTillRegisterStockingMutation,
  useGetTillRegisterStockingsQuery,
  useUpdateTillRegisterStockingMutation,
} = tillRegisterStockingApi;
