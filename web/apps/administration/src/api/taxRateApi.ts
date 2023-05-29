import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { TaxRate } from "@stustapay/models";

const taxRateAdapter = createEntityAdapter<TaxRate>({
  selectId: (taxRate) => taxRate.name,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const taxRateApi = createApi({
  reducerPath: "taxRatesApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["taxRate"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTaxRateByName: builder.query<EntityState<TaxRate>, string>({
      query: (name) => `/tax-rates/${name}`,
      transformResponse: (response: TaxRate) => {
        return taxRateAdapter.addOne(taxRateAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["taxRate", { type: "taxRate" as const, name: arg }],
    }),
    getTaxRates: builder.query<EntityState<TaxRate>, void>({
      query: () => "/tax-rates",
      transformResponse: (response: TaxRate[]) => {
        return taxRateAdapter.addMany(taxRateAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((name) => ({ type: "taxRate" as const, name })), "taxRate"] : ["taxRate"],
    }),
    createTaxRate: builder.mutation<TaxRate, TaxRate>({
      query: (taxRate) => ({ url: "/tax-rates", method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
    updateTaxRate: builder.mutation<TaxRate, TaxRate>({
      query: ({ name, ...taxRate }) => ({ url: `/tax-rates/${name}`, method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
    deleteTaxRate: builder.mutation<void, string>({
      query: (name) => ({ url: `/tax-rates/${name}`, method: "DELETE" }),
      invalidatesTags: ["taxRate"],
    }),
  }),
});

export const { selectTaxRateAll, selectTaxRateById, selectTaxRateEntities, selectTaxRateIds, selectTaxRateTotal } =
  convertEntityAdaptorSelectors("TaxRate", taxRateAdapter.getSelectors());

export const {
  useCreateTaxRateMutation,
  useGetTaxRateByNameQuery,
  useGetTaxRatesQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,
} = taxRateApi;
