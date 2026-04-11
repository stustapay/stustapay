import i18n from "@/i18n";
import { z } from "zod";

export const ConnectivitySettingsSchema = z
  .object({
    wifi_ssid: z.string().trim().optional().nullable(),
    wifi_passphrase: z.string().trim().optional().nullable(),
  })
  .superRefine((values, ctx) => {
    const hasSsid = !!values.wifi_ssid;
    const hasPassphrase = !!values.wifi_passphrase;

    if (hasSsid !== hasPassphrase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wifi_passphrase"],
        message: i18n.t("settings.mdm.bothFieldsRequired"),
      });
    }
  });

export type ConnectivitySettings = z.infer<typeof ConnectivitySettingsSchema>;
