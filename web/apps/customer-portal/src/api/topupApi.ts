import { createApi } from "@reduxjs/toolkit/query/react";
import { customerApiBaseQuery } from "./common";
import { z } from "zod";

// const SUMUP_CONFIRM_CHECKOUT_URL = "https://api.sumup.com/v0.1/checkouts";

// export const SumupConfirmCheckoutSchema = z.object({
//   card: z.object({
//     name: z.string(),
//     number: z.string(),
//     expiry_month: z.string(),
//     expiry_year: z.string(),
//     cvv: z.string(),
//   }),
//   payment_type: z.string(), // "card"
// });

// export type SumupConfirmCheckout = z.infer<typeof SumupConfirmCheckoutSchema>;

// export const SumupConfirmCheckoutResponseSchema = z.object({
//   id: z.string(),
//   transaction_code: z.string(),
//   merchant_code: z.string(),
//   amount: z.number(),
//   vat_amount: z.number(),
//   tip_amount: z.number(),
//   currency: z.string(),
//   timestamp: z.string().datetime({ offset: true }),
//   status: z.string(),
//   payment_method: z.string(),
//   entry_mode: z.string(),
//   installments_count: z.number().int(),
//   auth_code: z.string(),
//   internal_id: z.number().int(),
// });

// export type SumupConfirmCheckoutResponse = z.infer<typeof SumupConfirmCheckoutResponseSchema>;

export const CreateCheckoutResponseSchema = z.object({
  checkout_reference: z.string(),
});

export type CreateCheckoutResponse = z.infer<typeof CreateCheckoutResponseSchema>;

// export const confirmSumupCheckout = async (checkoutId: string, payload: SumupConfirmCheckout) => {
//   await fetch(`${SUMUP_CONFIRM_CHECKOUT_URL}/${checkoutId}`, {
//     headers: {
//       "Content-Type": "application/json",
//       // TODO: other content encoding headers
//     },
//     body: JSON.stringify(payload),
//   });
// };



export const topupApi = createApi({
  reducerPath: "topupApi",
  baseQuery: customerApiBaseQuery,
  tagTypes: [],
  endpoints: (builder) => ({
    createCheckout: builder.mutation<CreateCheckoutResponse, { amount: number }>({
      query: (payload) => ({
        url: "/sumup/create-checkout/",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const { useCreateCheckoutMutation } = topupApi;
