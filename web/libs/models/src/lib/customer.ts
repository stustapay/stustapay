import { z } from "zod";
import { AccountSchema } from "./account";
import { OrderSchema } from "./order";

export const CustomerInfoSchema = z.object({
  iban: z.string().nullable(),
  account_name: z.string().nullable(),
  email: z.string().nullable(),
  donation: z.number().nullable(),
  error: z.string().nullable(),
  payout_run_id: z.number().nullable(),
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const CustomerSchema = AccountSchema.merge(CustomerInfoSchema);
export type Customer = z.infer<typeof CustomerSchema>;

export const BonSchema = z.object({
  bon_generated: z.boolean().nullable(),
  bon_output_file: z.string().nullable(),
});

export const OrderWithBonSchema = OrderSchema.merge(BonSchema);
export type OrderWithBon = z.infer<typeof OrderWithBonSchema>;
