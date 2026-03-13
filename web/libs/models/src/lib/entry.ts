import { z } from "zod";

export const NewEntryAreaSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});

export type NewEntryArea = z.infer<typeof NewEntryAreaSchema>;

export const NewEntryGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});

export type NewEntryGroup = z.infer<typeof NewEntryGroupSchema>;

export const NewEntryAreaGroupWindowSchema = z.object({
  start_at: z.string(),
  end_at: z.string(),
});

export type NewEntryAreaGroupWindow = z.infer<typeof NewEntryAreaGroupWindowSchema>;
