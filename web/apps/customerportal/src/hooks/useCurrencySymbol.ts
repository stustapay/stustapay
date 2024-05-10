import * as React from "react";
import { usePublicConfig } from "./usePublicConfig";

export const useCurrencySymbol = (): string => {
  const config = usePublicConfig();
  return React.useMemo(() => {
    const res = new Intl.NumberFormat("de-DE", { style: "currency", currency: config.currency_identifier })
      .formatToParts(1)
      .find((x) => x.type === "currency")?.value;

    if (res == null) {
      return "";
    }
    return res;
  }, [config]);
};
