import { z } from "zod";

export const UpdateTseSchema = z.object({
  name: z.string().min(1),
  ws_url: z.string().min(1),
  ws_timeout: z.number(),
  password: z.string(),
  first_operation: z.string().nullable(),
});
export type UpdateTse = z.infer<typeof UpdateTseSchema>;

export const NewTseSchema = UpdateTseSchema.merge(
  z.object({
    serial: z.string().min(1),
    type: z.literal("diebold_nixdorf"),
  })
);
export type NewTse = z.infer<typeof NewTseSchema>;
