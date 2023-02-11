import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { TaxRate } from "../models/taxRate";

export const taxRateApi = createApi({
  reducerPath: "taxRates",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8081" }),
  tagTypes: ["taxRate"],
  endpoints: (builder) => ({
    getTaxRateByName: builder.query<TaxRate, string>({
      query: (name) => `/tax-rates/${name}`,
      providesTags: (result, error, arg) => ["taxRate", { type: "taxRate" as const, name: arg }],
    }),
    getTaxRates: builder.query<TaxRate[], void>({
      query: () => "/tax-rates",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ name }) => ({ type: "taxRate" as const, name })), "taxRate"] : ["taxRate"],
    }),
    createTaxRate: builder.mutation<TaxRate, TaxRate>({
      query: (taxRate) => ({ url: "/tax-rates", method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
    updateTaxRate: builder.mutation<TaxRate, Partial<TaxRate> & Pick<TaxRate, "name">>({
      query: ({ name, ...taxRate }) => ({ url: `/tax-rates/${name}`, method: "POST", body: taxRate }),
      invalidatesTags: ["taxRate"],
    }),
  }),
});

export const { useCreateTaxRateMutation, useGetTaxRateByNameQuery, useGetTaxRatesQuery, useUpdateTaxRateMutation } =
  taxRateApi;
