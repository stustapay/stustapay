import { z } from "zod";
import iban from "iban";
import i18n from "@/i18n";
import { TranslationTextsSchema } from "./common";

const emptyString = () =>
  z
    .string()
    .optional()
    .transform((val) => val ?? "");

const undefineableString = () =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => val ?? undefined);

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "Required if payout is enabled",
};

export const PayoutSettingsSchema = z
  .object({
    translation_texts: TranslationTextsSchema.shape.translation_texts,
    sepa_enabled: z.boolean(),
    sepa_sender_name: emptyString(),
    sepa_sender_iban: z
      .string()
      .optional()
      .superRefine((val, ctx) => {
        if (val != null && !iban.isValid(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("settings.payout.ibanNotValid"),
          });
        }
      })
      .transform((val) => val ?? ""),
    sepa_description: emptyString(),
    sepa_allowed_country_codes: z.array(z.string()).default([]),
    payout_done_subject: undefineableString(),
    payout_done_message: undefineableString(),
    payout_registered_subject: undefineableString(),
    payout_registered_message: undefineableString(),
    payout_sender: z.string().email().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.sepa_enabled) {
      return;
    }
    if (data.sepa_sender_name === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sepa_sender_name"] });
    }
    if (data.sepa_sender_iban === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sepa_sender_iban"] });
    }
    if (data.sepa_description === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sepa_description"] });
    }
    if (data.sepa_allowed_country_codes === undefined || data.sepa_allowed_country_codes.length === 0) {
      ctx.addIssue({ ...requiredIssue, path: ["sepa_allowed_country_codes"] });
    }
  });

export type PayoutSettings = z.infer<typeof PayoutSettingsSchema>;
