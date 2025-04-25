import { z } from "zod";

export const PrivilegeSchema = z.enum([
  "node_administration",
  "customer_management",
  "payout_management",

  "create_user",
  "user_management",
  "allow_privileged_role_assignment",

  "view_node_stats",

  // festival workflow privileges
  "cash_transport",
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
    node_id: z.number().int(),
    id: z.number(),
  })
);

export type UserRole = z.infer<typeof UserRoleSchema>;

const CommonUserSchema = z.object({
  login: z.string().min(1),
  display_name: z.string(),
  description: z.string().optional().nullable(),
  user_tag_uid_hex: z
    .string()
    .regex(/[0-9a-fA-F]+/, "user tag uid must be a hexadecimal number")
    .optional()
    .nullable(),
  user_tag_pin: z.string().optional().nullable(),
});

export const UserSchema = CommonUserSchema.merge(
  z.object({
    id: z.number(),
  })
);

export type User = z.infer<typeof UserSchema>;

export const NewUserSchema = CommonUserSchema.merge(
  z.object({
    password: z.string().optional().nullable(),
  })
);

export type NewUser = z.infer<typeof NewUserSchema>;

export const getUserName = (user?: Pick<User, "login" | "display_name">) => {
  if (!user) {
    return "";
  }
  if (!user.display_name) {
    return user.login;
  }
  return user.display_name;
};

export const CurrentUserSchema = UserSchema.merge(
  z.object({
    transport_account_id: z.number().optional().nullable(),
    cashier_account_id: z.number().optional().nullable(),
    active_role_id: z.number().optional(),
    active_role_name: z.string().optional(),
    privileges: z.array(PrivilegeSchema),
  })
);

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
