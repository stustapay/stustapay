import { z } from "zod";

export const NewTerminalButtonSchema = z.object({
  name: z.string(),
  product_ids: z.array(z.number()),
});

export type NewTerminalButton = z.infer<typeof NewTerminalButtonSchema>;

export const UpdateTerminalButtonSchema = NewTerminalButtonSchema.merge(
  z.object({
    id: z.number(),
  })
);

export type UpdateTerminalButton = z.infer<typeof UpdateTerminalButtonSchema>;

export const TerminalButtonSchema = UpdateTerminalButtonSchema.merge(
  z.object({
    price: z.number(),
  })
);

export type TerminalButton = z.infer<typeof TerminalButtonSchema>;

export const NewTerminalLayoutSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  button_ids: z.array(z.number()).nullable(),
  allow_top_up: z.boolean(),
});

export type NewTerminalLayout = z.infer<typeof NewTerminalLayoutSchema>;

export const TerminalLayoutSchema = NewTerminalLayoutSchema.merge(
  z.object({
    id: z.number(),
  })
);
export type TerminalLayout = z.infer<typeof TerminalLayoutSchema>;

export const NewTerminalProfileSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  layout_id: z.number(),
});

export type NewTerminalProfile = z.infer<typeof NewTerminalProfileSchema>;

export const TerminalProfileSchema = NewTerminalProfileSchema.merge(
  z.object({
    id: z.number(),
  })
);
export type TerminalProfile = z.infer<typeof TerminalProfileSchema>;

export const NewTerminalSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  tse_id: z.string().nullable().optional(),
  active_shift: z.string().nullable().optional(),
  active_profile_id: z.number(),
  active_cashier_id: z.number().nullable().optional(),
});

export type NewTerminal = z.infer<typeof NewTerminalSchema>;

export const UpdateTerminalSchema = NewTerminalSchema.merge(z.object({ id: z.number() }));

export type UpdateTerminal = z.infer<typeof UpdateTerminalSchema>;

export const TerminalSchema = UpdateTerminalSchema.merge(
  z.object({
    registration_uuid: z.string().nullable(),
    session_uuid: z.string().nullable(),
  })
);

export type Terminal = z.infer<typeof TerminalSchema>;
