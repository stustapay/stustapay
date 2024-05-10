import * as React from "react";
import { useCurrencyIdentifier } from "./useCurrencyIdentifier";

export type CurrencyFormatter = (value?: number | null) => string;

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currency = useCurrencyIdentifier();

  return React.useCallback(
    (value?: number | null) => {
      if (value == null) {
        return "";
      }
      return Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
    },
    [currency]
  );
};
