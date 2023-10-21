import { z } from "zod";
import { ProductRestrictionSchema } from "./product";

export const NewTicketSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
  tax_rate_id: z.number().int(),
  initial_top_up_amount: z.number().min(0),
  restrictions: z.array(ProductRestrictionSchema),
  is_locked: z.boolean(),
});
export type NewTicket = z.infer<typeof NewTicketSchema>;
