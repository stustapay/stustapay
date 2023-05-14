import { z } from "zod";

export const NewTillButtonSchema = z.object({
  name: z.string(),
  product_ids: z.array(z.number().int()),
});

export type NewTillButton = z.infer<typeof NewTillButtonSchema>;

export const UpdateTillButtonSchema = NewTillButtonSchema.merge(
  z.object({
    id: z.number().int(),
  })
);

export type UpdateTillButton = z.infer<typeof UpdateTillButtonSchema>;

export const TillButtonSchema = UpdateTillButtonSchema.merge(
  z.object({
    price: z.number(),
  })
);

export type TillButton = z.infer<typeof TillButtonSchema>;

export const NewTillLayoutSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  button_ids: z.array(z.number().int()).nullable(),
});

export type NewTillLayout = z.infer<typeof NewTillLayoutSchema>;

export const TillLayoutSchema = NewTillLayoutSchema.merge(
  z.object({
    id: z.number(),
  })
);
export type TillLayout = z.infer<typeof TillLayoutSchema>;

export const NewTillProfileSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  layout_id: z.number().int(),
  allow_top_up: z.boolean(),
  allow_cash_out: z.boolean(),
  allow_ticket_sale: z.boolean(),
  allowed_role_names: z.array(z.string()),
});

export type NewTillProfile = z.infer<typeof NewTillProfileSchema>;

export const TillProfileSchema = NewTillProfileSchema.merge(
  z.object({
    id: z.number().int(),
  })
);
export type TillProfile = z.infer<typeof TillProfileSchema>;

export const NewTillSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  active_shift: z.string().nullable().optional(),
  active_profile_id: z.number(),
  active_user_id: z.number().nullable().optional(),
});

export type NewTill = z.infer<typeof NewTillSchema>;

export const UpdateTillSchema = NewTillSchema.merge(z.object({ id: z.number() }));

export type UpdateTill = z.infer<typeof UpdateTillSchema>;

export const TillSchema = UpdateTillSchema.merge(
  z.object({
    registration_uuid: z.string().nullable(),
    session_uuid: z.string().nullable(),
    current_cash_register_name: z.string().nullable(),
    current_cash_register_balance: z.number().nullable(),
    tse_id: z.number().int().nullable().optional(),
    tse_serial: z.string().nullable().optional(),
  })
);

export type Till = z.infer<typeof TillSchema>;

export const NewTillRegisterStockingSchema = z.object({
  name: z.string(),
  euro200: z.number().int(),
  euro100: z.number().int(),
  euro50: z.number().int(),
  euro20: z.number().int(),
  euro10: z.number().int(),
  euro5: z.number().int(),
  euro2: z.number().int(),
  euro1: z.number().int(),
  cent50: z.number().int(),
  cent20: z.number().int(),
  cent10: z.number().int(),
  cent5: z.number().int(),
  cent2: z.number().int(),
  cent1: z.number().int(),
  variable_in_euro: z.number(),
});

export type NewTillRegisterStocking = z.infer<typeof NewTillRegisterStockingSchema>;

export const UpdateTillRegisterStockingSchema = NewTillRegisterStockingSchema.merge(
  z.object({
    id: z.number().int(),
  })
);

export type UpdateTillRegisterStocking = z.infer<typeof UpdateTillRegisterStockingSchema>;

export const TillRegisterStockingSchema = UpdateTillRegisterStockingSchema.merge(
  z.object({
    total: z.number(),
  })
);

export type TillRegisterStocking = z.infer<typeof TillRegisterStockingSchema>;

export const NewTillRegisterSchema = z.object({
  name: z.string(),
});

export type NewTillRegister = z.infer<typeof NewTillRegisterSchema>;

export const TillRegisterSchema = NewTillRegisterSchema.merge(
  z.object({
    id: z.number().int(),
    current_cashier_id: z.number().int().nullable(),
    current_till_id: z.number().int().nullable(),
    current_balance: z.number(),
  })
);

export type TillRegister = z.infer<typeof TillRegisterSchema>;
