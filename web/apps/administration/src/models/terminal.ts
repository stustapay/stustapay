import { z } from "zod";

export const NewTerminalSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  tse_id: z.string().nullable(),
  active_shift: z.string().nullable(),
  active_profile_id: z.number().nullable(),
  active_cashier_id: z.number().nullable(),
});

export type NewTerminal = z.infer<typeof NewTerminalSchema>;

export const UpdateTerminalSchema = NewTerminalSchema.merge(z.object({ id: z.number() }));

export type UpdateTerminal = z.infer<typeof UpdateTerminalSchema>;

export const TerminalSchema = UpdateTerminalSchema.merge(
  z.object({
    registration_uuid: z.string().nullable(),
    is_logged_in: z.boolean(),
  })
);

export type Terminal = z.infer<typeof TerminalSchema>;
