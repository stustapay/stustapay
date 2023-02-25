import { z } from "zod";

export const ConfigEntrySchema = z.object({
  key: z.string().min(1),
  value: z.string().nullable(),
});

export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;
