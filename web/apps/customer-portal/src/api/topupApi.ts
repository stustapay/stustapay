import { createApi } from "@reduxjs/toolkit/query/react";
import { customerApiBaseQuery } from "./common";
import { z } from "zod";

export const CreateCheckoutResponseSchema = z.object({
  checkout_id: z.string(),
});

export type CreateCheckoutResponse = z.infer<typeof CreateCheckoutResponseSchema>;

export interface UpdateCheckoutResponse {
  status: "PENDING" | "FAILED" | "PAID";
  checkout_id: string;
}

export const topupApi = createApi({
  reducerPath: "topupApi",
  baseQuery: customerApiBaseQuery,
  tagTypes: [],
  endpoints: (builder) => ({
    createCheckout: builder.mutation<CreateCheckoutResponse, { amount: number }>({
      query: (payload) => ({
        url: "/sumup/create-checkout",
        method: "POST",
        body: payload,
      }),
    }),
    updateCheckout: builder.mutation<UpdateCheckoutResponse, { checkoutId: string }>({
      query: (payload) => ({
        url: "/sumup/check-checkout",
        method: "POST",
        body: { checkout_id: payload.checkoutId },
      }),
    }),
  }),
});

export const { useCreateCheckoutMutation, useUpdateCheckoutMutation } = topupApi;
