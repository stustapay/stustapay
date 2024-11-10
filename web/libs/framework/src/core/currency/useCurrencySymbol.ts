import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyIdentifier } from "./CurrencyProvider";

export const useCurrencySymbol = (): string => {
  const { i18n } = useTranslation();
  const currency = useCurrencyIdentifier();
  return React.useMemo(() => {
    const res = new Intl.NumberFormat(i18n.language, { style: "currency", currency })
      .formatToParts(1)
      .find((x) => x.type === "currency")?.value;

    if (res == null) {
      return "";
    }
    return res;
  }, [currency, i18n]);
};
