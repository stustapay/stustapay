import { z } from "zod";

export const PrivilegeSchema = z.enum([
  "account_management",
  "cashier_management",
  "config_management",
  "product_management",
  "tax_rate_management",
  "user_management",
  "till_management",
  "order_management",
  "festival_overview",

  // festival workflow privileges
  "terminal_login",
  "supervised_terminal_login",

  // festival order / ticket / voucher flow privileges
  // which orders are available (sale, ticket, ...) is determined by the terminal profile
  "can_book_orders",
  "grant_free_tickets",
  "grant_vouchers",
]);

export const Privilege = PrivilegeSchema.enum;

export type Privilege = z.infer<typeof PrivilegeSchema>;

export const NewUserRoleSchema = z.object({
  name: z.string(),
  is_privileged: z.boolean(),
  privileges: z.array(PrivilegeSchema),
});

export type NewUserRole = z.infer<typeof NewUserRoleSchema>;

export const UserRoleSchema = NewUserRoleSchema.merge(
  z.object({
    id: z.number(),
  })
);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const NewUserSchema = z.object({
  login: z.string().min(1),
  display_name: z.string().optional(),
  description: z.string().optional(),
  role_names: z.array(z.string()),
  password: z.string().nullable(),
  // user_tag_uid: z.bigint().optional().nullable(),
  user_tag_uid_hex: z.string().optional().nullable(),
  transport_account_id: z.number().optional().nullable(),
  cashier_account_id: z.number().optional().nullable(),
});

export type NewUser = z.infer<typeof NewUserSchema>;

export const UserSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  display_name: z.string().optional(),
  description: z.string().optional().nullable(),
  // user_tag_uid: z.bigint().optional().nullable(),
  user_tag_uid_hex: z.string().optional().nullable(),
  role_names: z.array(z.string()),
});

export type User = z.infer<typeof UserSchema>;

export const getUserName = (user: Pick<User, "login" | "display_name">) => {
  if (user.display_name === "" || user.display_name == null) {
    return user.login;
  }
  return user.display_name;
};

export const CurrentUserSchema = UserSchema.merge(
  z.object({
    // user_tag_uid: z.bigint().optional().nullable(),
    user_tag_uid_hex: z.string().optional().nullable(),
    transport_account_id: z.number().optional().nullable(),
    cashier_account_id: z.number().optional().nullable(),
    active_role_id: z.number().optional(),
    active_role_name: z.string().optional(),
    privileges: z.array(PrivilegeSchema),
  })
);

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
