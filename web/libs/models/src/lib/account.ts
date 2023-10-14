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
  id: z.number(),
  // user_tag_uid: z.bigint(),
  user_tag_uid_hex: z.string(),
  type: z.string(),
  name: z.string().nullable(),
  comment: z.string().nullable(),
  balance: z.number(),
  vouchers: z.number(),
  tag_history: z.array(
    z.object({
      // user_tag_uid: z.number().int(),
      user_tag_uid_hex: z.string(),
      mapping_was_valid_until: z.string().datetime({ offset: true }),
      account_id: z.number().int(),
      comment: z.string().nullable(),
    })
  ),
});

export type Account = z.infer<typeof AccountSchema>;
