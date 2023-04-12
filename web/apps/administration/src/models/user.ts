import { z } from "zod";

export const PrivilegeAdmin = "admin" as const;
export const PrivilegeFinanzorga = "finanzorga" as const;
export const PrivilegeCashier = "cashier" as const;

export const PossiblePrivileges = [PrivilegeAdmin, PrivilegeFinanzorga, PrivilegeCashier] as const;

export const PrivilegeSchema = z.union([z.literal("admin"), z.literal("finanzorga"), z.literal("cashier")]);

export type Privilege = z.infer<typeof PrivilegeSchema>;

export const NewUserSchema = z.object({
  login: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().optional(),
  privileges: z.array(PrivilegeSchema),
  password: z.string().optional().nullable(),
  user_tag_uid: z.number().optional().nullable(),
  transport_account_id: z.number().optional().nullable(),
  cashier_account_id: z.number().optional().nullable(),
});

export type NewUser = z.infer<typeof NewUserSchema>;

export const UserSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().optional(),
  privileges: z.array(PrivilegeSchema),
});

export type User = z.infer<typeof UserSchema>;
