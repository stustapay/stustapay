import { z } from "zod";

export const SystemAccounts = {
  SALE_EXIT: 0,
  CASH_ENTRY: 1,
  DEPOSIT: 2,
  SUMUP: 3,
  CASH_VAULT: 4,
  IMBALANCE: 5,
  MONEY_VOUCHER_CREATE: 6,
  CASH_EXIT: 7,
  CASH_SALE_SOURCE: 8,
} as const;

export const AccountSchema = z.object({
  id: z.number(),
  user_tag_uid: z.bigint(),
  type: z.string(),
  name: z.string().nullable(),
  comment: z.string().nullable(),
  balance: z.number(),
  vouchers: z.number(),
});

export type Account = z.infer<typeof AccountSchema>;
