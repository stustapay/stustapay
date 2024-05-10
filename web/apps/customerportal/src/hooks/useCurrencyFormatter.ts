import * as React from "react";
import { usePublicConfig } from "./usePublicConfig";

export type CurrencyFormatter = (value: number | null) => string;

const language = "de-DE";

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const config = usePublicConfig();
  return React.useCallback(
    (val: number | null) => {
      if (val == null) {
        return "";
      }

      const res = new Intl.NumberFormat(language, {
        style: "currency",
        currency: config.currency_identifier,
        maximumFractionDigits: 2,
      }).format(val);

      return res;
    },
    [config]
  );
};
