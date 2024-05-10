import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCurrentEventSettings } from "./useCurrentEventSettings";

export const useCurrencySymbol = (): string => {
  const { i18n } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();
  return React.useMemo(() => {
    const res = new Intl.NumberFormat(i18n.language, { style: "currency", currency: eventSettings.currency_identifier })
      .formatToParts(1)
      .find((x) => x.type === "currency")?.value;

    if (res == null) {
      return "";
    }
    return res;
  }, [eventSettings, i18n]);
};
