import * as React from "react";
import { useCurrencyIdentifier } from "./CurrencyProvider";
import { createCurrencyFormatter, CurrencyFormatter } from "./createCurrencyFormatter";

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currency = useCurrencyIdentifier();

  return React.useMemo(() => createCurrencyFormatter(currency), [currency]);
};
