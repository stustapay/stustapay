
import { createApi } from "@reduxjs/toolkit/query/react";
import { customerApiBaseQuery } from "./common";

export const topupApi = createApi({
  reducerPath: "customerApi",
  baseQuery: customerApiBaseQuery,
  tagTypes: ["customer", "order", "data_privacy_url"],
  endpoints: (builder) => ({

    setAmount: builder.mutation<void, number>({
      query: (amount) => ({
        url: "/customer_info/",
        method: "POST",
        body: amount,
      }),
    }),
  }),
});

export const { useSetAmountMutation } = topupApi;