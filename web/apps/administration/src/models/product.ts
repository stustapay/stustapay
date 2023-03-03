import { z } from "zod";

export const NewProductSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
  tax_name: z.string().min(1),
});
export type NewProduct = z.infer<typeof NewProductSchema>;

export const ProductSchema = NewProductSchema.merge(z.object({ id: z.number() }));
export type Product = z.infer<typeof ProductSchema>;
