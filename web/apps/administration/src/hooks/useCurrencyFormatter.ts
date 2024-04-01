import { useCurrencyIdentifier } from "./useCurrencyIdentifier";

export type CurrencyFormatter = (value?: number | null) => string;

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const currency = useCurrencyIdentifier();
  const language = "de-DE";

  return (value?: number | null) => {
    if (value == null) {
      return "";
    }
    return Intl.NumberFormat(language, { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  };
};
