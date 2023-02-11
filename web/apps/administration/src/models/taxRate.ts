import { z } from "zod";

export const TaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number(),
  description: z.string().min(1),
});
export type TaxRate = z.infer<typeof TaxRateSchema>;
