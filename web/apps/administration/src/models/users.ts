import { z } from "zod";

export const NewUserSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  privileges: z.array(z.string()),
});

export type NewUser = z.infer<typeof NewUserSchema>;

export const UserSchema = NewUserSchema.merge(
  z.object({
    id: z.number(),
  })
);

export type User = z.infer<typeof UserSchema>;
