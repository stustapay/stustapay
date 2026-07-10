import { z } from "zod";

export const TaxTypeSchema = z.enum(["regular_vat", "reduced_vat", "no_tax", "transparent"]);

export const TaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number(),
  description: z.string().min(1),
  tax_type: TaxTypeSchema,
});
export type TaxRate = z.infer<typeof TaxRateSchema>;
export type TaxType = z.infer<typeof TaxTypeSchema>;
