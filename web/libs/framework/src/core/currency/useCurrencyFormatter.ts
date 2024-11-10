import * as React from "react";
import { useCurrencyIdentifier } from "./CurrencyProvider";
import { createCurrencyFormatter, CurrencyFormatter } from "./createCurrencyFormatter";

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currency = useCurrencyIdentifier();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(createCurrencyFormatter(currency), [currency]);
};
