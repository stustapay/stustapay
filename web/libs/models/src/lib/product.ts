import { z } from "zod";

export const ProductRestrictionSchema = z.union([z.literal("under_16"), z.literal("under_18")]);

export type ProductRestriction = z.infer<typeof ProductRestrictionSchema>;

export const ProductRestrictions: ProductRestriction[] = ["under_16", "under_18"];

export const NewProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().nullable(),
  fixed_price: z.boolean(),
  price_in_vouchers: z.number().optional().nullable(),
  restrictions: z.array(ProductRestrictionSchema),
  is_locked: z.boolean(),
  is_returnable: z.boolean(),
  tax_name: z.string().min(1),
});
export type NewProduct = z.infer<typeof NewProductSchema>;

export const ProductSchema = NewProductSchema.merge(
  z.object({
    id: z.number(),
    tax_rate: z.number(),
  })
);
export type Product = z.infer<typeof ProductSchema>;
