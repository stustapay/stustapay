import { z } from "zod";

export const CashierSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().optional(),
  cash_drawer_balance: z.number(),
  user_tag_uid: z.number().optional().nullable(),
  till_id: z.number().optional(),
});

export type Cashier = z.infer<typeof CashierSchema>;

export const NewCashierCloseOutSchema = z.object({
  cashier_id: z.number(),
  comment: z.string(),
  actual_cash_drawer_balance: z.number(),
});

export type NewCashierCloseOut = z.infer<typeof NewCashierCloseOutSchema>;

export const CashierCloseOutResultSchema = z.object({
  cashier_id: z.number(),
  imbalance: z.number(),
});

export type CashierCloseOutResult = z.infer<typeof CashierCloseOutResultSchema>;

export const CashierShiftSchema = z.object({
  id: z.number(),
  comment: z.string(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  final_cash_drawer_balance: z.number(),
  final_cash_drawer_imbalance: z.number(),
});

export type CashierShift = z.infer<typeof CashierShiftSchema>;
