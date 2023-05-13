import { z } from "zod";
import { ProductSchema } from "./product";

export const LineItemSchema = z.object({
  item_id: z.number(),
  quantity: z.number(),
  product: ProductSchema,
  product_price: z.number(),
  total_price: z.number(),
  tax_name: z.string(),
  tax_rate: z.number(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const OrderTypeSchema = z.union([
  z.literal("sale"),
  z.literal("cancel_sale"),
  z.literal("top_up"),
  z.literal("pay_out"),
  z.literal("ticket"),
]);

export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderSchema = z.object({
  id: z.number(),
  uuid: z.string().uuid(),
  item_count: z.number(),
  booked_at: z.string().datetime({ offset: true }),
  payment_method: z.string(),
  order_type: OrderTypeSchema,
  total_price: z.number(),
  total_tax: z.number(),
  total_no_tax: z.number(),

  cashier_id: z.number(),
  till_id: z.number(),
  customer_account_id: z.number().nullable(),
  customer_tag_uid: z.bigint().nullable(),
  line_items: z.array(LineItemSchema),
});

export type Order = z.infer<typeof OrderSchema>;
