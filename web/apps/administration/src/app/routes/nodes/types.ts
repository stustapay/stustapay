import { z } from "zod";

export const ObjectTypeSchema = z.enum([
  "user",
  "product",
  "ticket",
  "till",
  "user_role",
  "tax_rate",
  "user_tag",
  "tse",
  "account",
  "terminal",
]);

export const ObjectTypes = ObjectTypeSchema.options.sort();

export const NodeSettingsSchema = z.object({
  name: z.string(),
  description: z
    .string()
    .optional()
    .transform((val) => val ?? ""),
  forbidden_objects_at_node: z.array(ObjectTypeSchema),
  forbidden_objects_in_subtree: z.array(ObjectTypeSchema),
});
export type NodeSettingsSchemaType = z.infer<typeof NodeSettingsSchema>;
