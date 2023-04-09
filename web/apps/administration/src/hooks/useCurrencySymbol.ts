import { selectConfigEntryById, useGetConfigEntriesQuery } from "@api";

export const useCurrencySymbol = (): string => {
  const { currencySymbol, error } = useGetConfigEntriesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      currencySymbol: data ? selectConfigEntryById(data, "currency.symbol")?.value : undefined,
    }),
  });

  if (!currencySymbol || error) {
    throw new Error("Currency symbol is undefined unexpectedly");
  }

  return currencySymbol;
};
