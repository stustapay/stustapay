import { z } from "zod";
import { ProductSchema } from "./product";

export const CashierSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().optional(),
  cash_drawer_balance: z.number(),
  // user_tag_uid: z.bigint(),
  user_tag_uid_hex: z.string(),
  till_ids: z.array(z.number().int()),
});

export type Cashier = z.infer<typeof CashierSchema>;

export const NewCashierCloseOutSchema = z.object({
  cashier_id: z.number().int(),
  comment: z.string(),
  actual_cash_drawer_balance: z.number(),
  closing_out_user_id: z.number().int(),
});

export type NewCashierCloseOut = z.infer<typeof NewCashierCloseOutSchema>;

export const CashierCloseOutResultSchema = z.object({
  cashier_id: z.number().int(),
  imbalance: z.number(),
});

export type CashierCloseOutResult = z.infer<typeof CashierCloseOutResultSchema>;

export const CashierShiftSchema = z.object({
  id: z.number().int(),
  comment: z.string(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  actual_cash_drawer_balance: z.number(),
  expected_cash_drawer_balance: z.number(),
  cash_drawer_imbalance: z.number(),
  closing_out_user_id: z.number(),
});

export type CashierShift = z.infer<typeof CashierShiftSchema>;

export const CashierShiftStatsSchema = z.object({
  booked_products: z.array(
    z.object({
      product: ProductSchema,
      quantity: z.number().int(),
    })
  ),
});

export type CashierShiftStats = z.infer<typeof CashierShiftStatsSchema>;
