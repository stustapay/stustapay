import { z } from "zod";

export const CashierSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  cash_drawer_balance: z.number(),
  user_tag_id: z.number().optional().nullable(),
  till_id: z.number().optional(),
});

export type Cashier = z.infer<typeof CashierSchema>;
