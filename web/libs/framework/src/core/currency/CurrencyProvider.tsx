import * as React from "react";

type ICurrencyContext = {
  // currencySymbol: string;
  currencyIdentifier: string;
};

const CurrencyContext = React.createContext<ICurrencyContext | null>(null);

export type CurrencyProviderProps = {
  currencyIdentifier: string;
  children?: React.ReactNode;
};

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ currencyIdentifier, children }) => {
  const value = React.useMemo(
    () => ({
      currencyIdentifier,
    }),
    [currencyIdentifier]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useOptionalCurrencyIdentifier = () => {
  const ctx = React.useContext(CurrencyContext);

  return ctx?.currencyIdentifier;
};

export const useCurrencyIdentifier = () => {
  const ctx = React.useContext(CurrencyContext);

  if (!ctx) {
    throw new Error("Cannot use 'useCurrencyIdentifier' outside of a CurrencyProvider");
  }

  return ctx.currencyIdentifier;
};
