import { z } from "zod";

export const TerminalLayoutProductsSchema = z.array(z.object({ product_id: z.number(), sequence_number: z.number() }));

export type TerminalLayoutProducts = z.infer<typeof TerminalLayoutProductsSchema>;

export const NewTerminalLayoutSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  products: TerminalLayoutProductsSchema.nullable(),
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
