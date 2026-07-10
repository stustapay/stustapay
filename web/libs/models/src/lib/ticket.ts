import { z } from "zod";

export const NewTicketSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
  tax_rate_id: z.number().int(),
  initial_top_up_amount: z.number().min(0),
  user_tag_variant_ids: z.array(z.number().int()),
  is_locked: z.boolean(),
});
export type NewTicket = z.infer<typeof NewTicketSchema>;
