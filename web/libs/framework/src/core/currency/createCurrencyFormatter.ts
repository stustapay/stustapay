export type CurrencyFormatter = (value?: number | null) => string;

export const createCurrencyFormatter = (currencyIdentifier: string): CurrencyFormatter => {
  return (value?: number | null) => {
    if (value == null) {
      return "";
    }
    return Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currencyIdentifier,
      maximumFractionDigits: 2,
    }).format(value);
  };
};
