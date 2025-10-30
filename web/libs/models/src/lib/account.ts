import { z } from "zod";

export const UserTagDetailSchema = z.object({
  // user_tag_uid: z.number().int(),
  user_tag_uid_hex: z.string(),
  comment: z.string().nullable(),
  account_id: z.number().int().nullable(),
  account_history: z.array(
    z.object({
      mapping_was_valid_until: z.string().datetime({ offset: true }),
      account_id: z.number().int(),
    })
  ),
});

export type UserTagDetail = z.infer<typeof UserTagDetailSchema>;

export const AccountSchema = z.object({
  node_id: z.number(),
  id: z.number(),
  type: z.string(),
  name: z.string().nullable(),
  comment: z.string().nullable(),
  balance: z.number(),
  vouchers: z.number(),
  user_tag_id: z.number().nullable(),
  user_tag_uid: z.number().nullable(),
  user_tag_comment: z.string().optional().nullable(),
  restriction: z.string().nullable(),
  is_vip: z.boolean().optional(),
  vip_max_balance: z.number().nullable().optional(),
  tag_history: z.array(z.any()), // Keep flexible for now
});

export type Account = z.infer<typeof AccountSchema>;
