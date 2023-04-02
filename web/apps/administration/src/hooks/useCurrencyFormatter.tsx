import { selectConfigEntryById, useGetConfigEntriesQuery } from "@api";

export type CurrencyFormatter = (value: number | null) => string;

export const useCurrencyFormatter = (): CurrencyFormatter => {
  const { currencySymbol, error } = useGetConfigEntriesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      currencySymbol: data ? selectConfigEntryById(data, "currency.symbol")?.value : undefined,
    }),
  });

  if (!currencySymbol || error) {
    throw new Error("Currency symbol is undefined unexpectedly");
  }

  return (value: number | null) => {
    if (value === null) {
      return "";
    }
    return `${value.toFixed(2)} ${currencySymbol}`;
  };
};
