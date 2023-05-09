import { createApi } from "@reduxjs/toolkit/query/react";
import { customerApiBaseQuery } from "./common";
import { Customer, CustomerInfo, OrderWithBon } from "@stustapay/models";

export const customerApi = createApi({
  reducerPath: "customerApi",
  baseQuery: customerApiBaseQuery,
  tagTypes: ["customer", "order", "data_privacy_url"],
  endpoints: (builder) => ({
    getCustomer: builder.query<Customer, void>({
      query: () => "/customer/",
      providesTags: (result) => ["customer"],
    }),

    getOrdersWithBon: builder.query<OrderWithBon[], void>({
      query: () => "/orders_with_bon/",
      providesTags: (result) => ["order"],
    }),

    getDataPrivacyUrl: builder.query<string, void>({
      query: () => "/data_privacy_url/",
      providesTags: (result) => ["data_privacy_url"],
    }),

    setCustomerInfo: builder.mutation<void, CustomerInfo>({
      query: (customer) => ({
        url: "/customer_info/",
        method: "POST",
        body: { iban: customer.iban, account_name: customer.account_name, email: customer.email },
      }),
    }),
  }),
});

export const { useGetCustomerQuery, useGetOrdersWithBonQuery, useGetDataPrivacyUrlQuery, useSetCustomerInfoMutation } = customerApi;
