import * as React from "react";

import { createCurrencyFormatter, CurrencyFormatter } from "./createCurrencyFormatter";
import { useCurrencyIdentifier } from "./CurrencyProvider";

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currency = useCurrencyIdentifier();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(createCurrencyFormatter(currency), [currency]);
};
