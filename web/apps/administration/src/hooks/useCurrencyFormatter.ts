import { useCurrencySymbol } from "./useCurrencySymbol";

export type CurrencyFormatter = (value?: number | null) => string;

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currencySymbol = useCurrencySymbol();

  return (value?: number | null) => {
    if (value == null) {
      return "";
    }
    return `${value.toFixed(2)} ${currencySymbol}`;
  };
};
