import { z } from "zod";
import { ProductSchema } from "./product";

export const LineItemSchema = z.object({
  product_id: z.number(),
  order_id: z.number(),
  item_id: z.number(),
  quantity: z.number(),
  product: ProductSchema,
  price: z.number(),
  total_price: z.number(),
  tax_name: z.string(),
  tax_rate: z.number(),
  total_tax: z.number(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const OrderTypeSchema = z.union([z.literal("sale"), z.literal("topup_cash"), z.literal("topup_sumup")]);

export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderSchema = z.object({
  id: z.number(),
  uuid: z.string().uuid(),
  itemcount: z.number(),
  status: z.string(),
  created_at: z.string().datetime({ offset: true }),
  finished_at: z.string().datetime({ offset: true }).nullable(),
  payment_method: z.string().nullable(),
  order_type: OrderTypeSchema.nullable(),

  cashier_id: z.number(),
  till_id: z.number(),
  customer_account_id: z.number(),
  line_items: z.array(LineItemSchema),
});

export type Order = z.infer<typeof OrderSchema>;
