import { z } from "zod";

export const EventPrivilegeSchema = z.enum([
  "customer_management",
  "payout_management",
  "create_user",
  "cash_transport",
  "terminal_login",
  "supervised_terminal_login",
  "grant_free_tickets",
  "grant_vouchers",
]);

export const NodePrivilegeSchema = z.enum([
  "node_administration",
  "allow_privileged_role_assignment",
  "allow_role_assignment",
  "view_node_stats",
  "can_book_orders",
]);

export const PrivilegeSchema = z.union([EventPrivilegeSchema, NodePrivilegeSchema]);

export const EventPrivilege = EventPrivilegeSchema.enum;
export const NodePrivilege = NodePrivilegeSchema.enum;

export type EventPrivilege = z.infer<typeof EventPrivilegeSchema>;
export type NodePrivilege = z.infer<typeof NodePrivilegeSchema>;

export const NewUserRoleSchema = z.object({
  name: z.string(),
  is_privileged: z.boolean(),
  event_privileges: z.array(EventPrivilegeSchema),
  node_privileges: z.array(NodePrivilegeSchema),
});

export type NewUserRole = z.infer<typeof NewUserRoleSchema>;

export const UserRoleSchema = z.object({
  ...NewUserRoleSchema.shape,
  node_id: z.number().int(),
  id: z.number(),
});

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

export const UserSchema = z.object({
  ...CommonUserSchema.shape,
  id: z.number(),
});

export type User = z.infer<typeof UserSchema>;

export const NewUserSchema = z.object({
  ...CommonUserSchema.shape,
  password: z.string().optional().nullable(),
});

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

export const CurrentUserSchema = z.object({
  ...UserSchema.shape,
  transport_account_id: z.number().optional().nullable(),
  cashier_account_id: z.number().optional().nullable(),
  active_role_id: z.number().optional(),
  active_role_name: z.string().optional(),
  event_privileges: z.array(EventPrivilegeSchema),
  node_privileges: z.array(NodePrivilegeSchema),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
