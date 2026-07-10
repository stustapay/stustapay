import { z } from "zod";

export const UserTagVariantSchema = z.object({
  id: z.number().int(),
  node_id: z.number().int(),
  variant_name: z.string(),
  description: z.string(),
  priority: z.number().int(),
});

export type UserTagVariant = z.infer<typeof UserTagVariantSchema>;

export const NewUserTagVariantSchema = UserTagVariantSchema.omit({ id: true, node_id: true }).extend({
  description: z.string().default(""),
  priority: z.number().int().default(0),
});

export type NewUserTagVariant = z.infer<typeof NewUserTagVariantSchema>;
