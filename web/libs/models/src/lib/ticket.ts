import { z } from "zod";
import { ProductRestrictionSchema } from "./product";

export const NewTicketSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  product_id: z.number().int(),
  initial_top_up_amount: z.number().min(0),
  restriction: ProductRestrictionSchema.optional().nullable(),
});
export type NewTicket = z.infer<typeof NewTicketSchema>;

export const TicketSchema = NewTicketSchema.merge(
  z.object({
    id: z.number(),
    product_name: z.string(),
    price: z.number(),
    total_price: z.number(),
    tax_rate: z.number(),
    tax_name: z.string(),
  })
);
export type Ticket = z.infer<typeof TicketSchema>;
