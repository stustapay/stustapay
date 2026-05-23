import { z } from "zod";

export const NewTillButtonSchema = z.object({
  name: z.string(),
  product_ids: z.array(z.number().int()),
});

export type NewTillButton = z.infer<typeof NewTillButtonSchema>;

export const UpdateTillButtonSchema = z.object({
  ...NewTillButtonSchema.shape,
  id: z.number().int(),
});

export type UpdateTillButton = z.infer<typeof UpdateTillButtonSchema>;

export const TillButtonSchema = z.object({
  ...UpdateTillButtonSchema.shape,
  price: z.number(),
});

export type TillButton = z.infer<typeof TillButtonSchema>;

export const NewTillLayoutSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  button_ids: z.array(z.number().int()).nullable().optional(),
  ticket_ids: z.array(z.number().int()).nullable().optional(),
});

export type NewTillLayout = z.infer<typeof NewTillLayoutSchema>;

export const TillLayoutSchema = z.object({
  ...NewTillLayoutSchema.shape,
  id: z.number().int(),
});
export type TillLayout = z.infer<typeof TillLayoutSchema>;

export const NewTillProfileSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  layout_id: z.number().int(),
  allow_top_up: z.boolean(),
  allow_cash_out: z.boolean(),
  allow_ticket_sale: z.boolean(),
  allow_ticket_vouchers: z.boolean(),
  enable_ssp_payment: z.boolean(),
  enable_cash_payment: z.boolean(),
  enable_card_payment: z.boolean(),
});

export type NewTillProfile = z.infer<typeof NewTillProfileSchema>;

export const TillProfileSchema = z.object({
  ...NewTillProfileSchema.shape,
  id: z.number().int(),
});
export type TillProfile = z.infer<typeof TillProfileSchema>;

export const NewTillSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  active_shift: z.string().nullable().optional(),
  active_profile_id: z.number(),
  active_user_id: z.number().nullable().optional(),
  terminal_id: z.number().nullable().optional(),
});

export type NewTill = z.infer<typeof NewTillSchema>;

export const UpdateTillSchema = z.object({ ...NewTillSchema.shape, id: z.number() });

export type UpdateTill = z.infer<typeof UpdateTillSchema>;

export const NewCashRegisterStockingSchema = z.object({
  name: z.string(),
  euro200: z.number().int().optional(),
  euro100: z.number().int().optional(),
  euro50: z.number().int().optional(),
  euro20: z.number().int().optional(),
  euro10: z.number().int().optional(),
  euro5: z.number().int().optional(),
  euro2: z.number().int().optional(),
  euro1: z.number().int().optional(),
  cent50: z.number().int().optional(),
  cent20: z.number().int().optional(),
  cent10: z.number().int().optional(),
  cent5: z.number().int().optional(),
  cent2: z.number().int().optional(),
  cent1: z.number().int().optional(),
  variable_in_euro: z.number().optional(),
});

export type NewCashRegisterStocking = z.infer<typeof NewCashRegisterStockingSchema>;

export const UpdateCashRegisterStockingSchema = z.object({
  ...NewCashRegisterStockingSchema.shape,
  id: z.number().int(),
});

export type UpdateCashRegisterStocking = z.infer<typeof UpdateCashRegisterStockingSchema>;

export const CashRegisterStockingSchema = z.object({
  ...UpdateCashRegisterStockingSchema.shape,
  total: z.number(),
});

export type CashRegisterStocking = z.infer<typeof CashRegisterStockingSchema>;

export const NewCashRegisterSchema = z.object({
  name: z.string(),
});

export type NewCashRegister = z.infer<typeof NewCashRegisterSchema>;

export const UpdateCashRegisterSchema = NewCashRegisterSchema;

export type UpdateCashRegister = z.infer<typeof UpdateCashRegisterSchema>;

export const CashRegisterSchema = z.object({
  ...NewCashRegisterSchema.shape,
  id: z.number().int(),
  current_cashier_id: z.number().int().nullable(),
  current_till_id: z.number().int().nullable(),
  current_balance: z.number(),
});

export type CashRegister = z.infer<typeof CashRegisterSchema>;
