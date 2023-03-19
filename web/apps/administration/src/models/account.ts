import { z } from "zod";

export const AccountSchema = z.object({
  id: z.number(),
  user_tag_id: z.number(),
  type: z.string(),
  name: z.string().nullable(),
  comment: z.string().nullable(),
  balance: z.number(),
});

export type Account = z.infer<typeof AccountSchema>;
