import { Chip, Stack, Typography } from "@mui/material";
import { type TFunction } from "i18next";
import * as React from "react";
import { useTranslation } from "react-i18next";

const paymentMethodTranslationKeys = {
  apple_pay: "topup.paymentMethods.apple_pay",
  bancontact: "topup.paymentMethods.bancontact",
  blik: "topup.paymentMethods.blik",
  card: "topup.paymentMethods.card",
  google_pay: "topup.paymentMethods.google_pay",
  ideal: "topup.paymentMethods.ideal",
  klarna: "topup.paymentMethods.klarna",
  sofort: "topup.paymentMethods.sofort",
} as const;

const normalizePaymentMethods = (paymentMethods: string[] | undefined) => {
  const normalized: string[] = [];
  if (!paymentMethods) {
    return normalized;
  }
  for (const paymentMethod of paymentMethods) {
    const normalizedId = paymentMethod.trim().toLowerCase();
    if (normalizedId && !normalized.includes(normalizedId)) {
      normalized.push(normalizedId);
    }
  }
  return normalized;
};

const formatUnknownPaymentMethod = (paymentMethod: string) =>
  paymentMethod
    .trim()
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`))
    .join(" ");

export const getSumupPaymentMethodLabel = (t: TFunction, paymentMethod: string) => {
  const normalizedId = paymentMethod.trim().toLowerCase();
  const translationKey =
    paymentMethodTranslationKeys[normalizedId as keyof typeof paymentMethodTranslationKeys];

  if (translationKey) {
    return t(translationKey);
  }

  return formatUnknownPaymentMethod(normalizedId);
};

type SumupPaymentMethodsProps = {
  paymentMethods?: string[];
};

export const SumupPaymentMethods: React.FC<SumupPaymentMethodsProps> = ({ paymentMethods }) => {
  const { t } = useTranslation();
  const normalizedPaymentMethods = normalizePaymentMethods(paymentMethods);

  return (
    <Stack spacing={1}>
      <Typography variant="body2" component="div">
        {t("topup.description")}
      </Typography>
      {normalizedPaymentMethods.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" component="div" sx={{ letterSpacing: 0.6, opacity: 0.8, textTransform: "uppercase" }}>
            {t("topup.availablePaymentMethods")}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {normalizedPaymentMethods.map((paymentMethod) => (
              <Chip key={paymentMethod} label={getSumupPaymentMethodLabel(t, paymentMethod)} size="small" variant="outlined" />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};
