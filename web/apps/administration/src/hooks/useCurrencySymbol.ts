import { config } from "@api/common";

export const useCurrencySymbol = (): string => {
  return config.currencySymbol;
};
