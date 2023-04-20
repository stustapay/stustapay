import { z } from "zod";

export const NewTillButtonSchema = z.object({
  name: z.string(),
  product_ids: z.array(z.number()),
});

export type NewTillButton = z.infer<typeof NewTillButtonSchema>;

export const UpdateTillButtonSchema = NewTillButtonSchema.merge(
  z.object({
    id: z.number(),
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
  button_ids: z.array(z.number()).nullable(),
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
  layout_id: z.number(),
  allow_top_up: z.boolean(),
  allow_cash_out: z.boolean(),
});

export type NewTillProfile = z.infer<typeof NewTillProfileSchema>;

export const TillProfileSchema = NewTillProfileSchema.merge(
  z.object({
    id: z.number(),
  })
);
export type TillProfile = z.infer<typeof TillProfileSchema>;

export const NewTillSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  tse_id: z.string().nullable().optional(),
  active_shift: z.string().nullable().optional(),
  active_profile_id: z.number(),
  active_cashier_id: z.number().nullable().optional(),
});

export type NewTill = z.infer<typeof NewTillSchema>;

export const UpdateTillSchema = NewTillSchema.merge(z.object({ id: z.number() }));

export type UpdateTill = z.infer<typeof UpdateTillSchema>;

export const TillSchema = UpdateTillSchema.merge(
  z.object({
    registration_uuid: z.string().nullable(),
    session_uuid: z.string().nullable(),
  })
);

export type Till = z.infer<typeof TillSchema>;
