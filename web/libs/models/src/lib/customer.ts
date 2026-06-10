import { z } from "zod";

import { AccountSchema } from "./account";
import { OrderSchema } from "./order";

export const CustomerInfoSchema = z.object({
  iban: z.string().nullable(),
  account_name: z.string().nullable(),
  email: z.string().nullable(),
  donation: z.number().nullable(),
  payout_error: z.string().nullable(),
  payout_run_id: z.number().nullable(),
  payout_export: z.boolean().nullable(),
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const CustomerSchema = z.object({
  ...AccountSchema.shape,
  ...CustomerInfoSchema.shape,
});
export type Customer = z.infer<typeof CustomerSchema>;

export const BonSchema = z.object({
  bon_generated: z.boolean().nullable(),
  bon_output_file: z.string().nullable(),
});

export const OrderWithBonSchema = z.object({
  ...OrderSchema.shape,
  ...BonSchema.shape,
});
export type OrderWithBon = z.infer<typeof OrderWithBonSchema>;
