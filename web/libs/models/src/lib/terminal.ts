import { z } from "zod";

export const NewTerminalSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  mode: z.enum(["till", "entry", "exit"]).default("till"),
  entry_area_id: z.number().int().optional().nullable(),
  self_service: z.boolean().default(false),
});

export type NewTerminal = z.infer<typeof NewTerminalSchema>;

export const UpdateTerminalSchema = NewTerminalSchema.merge(z.object({ id: z.number() }));

export type UpdateTerminal = z.infer<typeof UpdateTerminalSchema>;
