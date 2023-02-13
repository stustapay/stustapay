import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { TaxRate } from "../models/taxRate";
import { baseUrl, prepareAuthHeaders } from "./common";

export const taxRateApi = createApi({
  reducerPath: "taxRatesApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["taxRate"],
  endpoints: (builder) => ({
    getTaxRateByName: builder.query<TaxRate, string>({
      query: (name) => `/tax-rates/${name}/`,
      providesTags: (result, error, arg) => ["taxRate", { type: "taxRate" as const, name: arg }],
    }),
    getTaxRates: builder.query<TaxRate[], void>({
      query: () => "/tax-rates/",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ name }) => ({ type: "taxRate" as const, name })), "taxRate"] : ["taxRate"],
    }),
    createTaxRate: builder.mutation<TaxRate, TaxRate>({
      query: (taxRate) => ({ url: "/tax-rates/", method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
    updateTaxRate: builder.mutation<TaxRate, TaxRate>({
      query: ({ name, ...taxRate }) => ({ url: `/tax-rates/${name}/`, method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
    deleteTaxRate: builder.mutation<void, string>({
      query: (name) => ({ url: `/tax-rates/${name}/`, method: "DELETE" }),
      invalidatesTags: ["taxRate"],
    }),
  }),
});

export const {
  useCreateTaxRateMutation,
  useGetTaxRateByNameQuery,
  useGetTaxRatesQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,
} = taxRateApi;
