import { z } from "zod";
import { AccountSchema } from "./account";
export const CustomerInfoSchema = z.object({
    iban: z.string().nullable(),
    account_name: z.string().nullable(),
    email: z.string().nullable(),
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const CustomerSchema = AccountSchema.merge(CustomerInfoSchema);
export type Customer = z.infer<typeof CustomerSchema>;
