import { z } from "zod";

const emptyString = () =>
  z
    .string()
    .optional()
    .transform((val) => val ?? "");

const nullableString = () =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => val ?? null);

const undefineableString = () =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => val ?? undefined);

export const zodExtension = {
  emptyString,
  nullableString,
  undefineableString,
};
