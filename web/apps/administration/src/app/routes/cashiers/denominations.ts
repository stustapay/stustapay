import * as React from "react";
import i18n from "@/i18n";
import { useCurrencyIdentifier } from "@stustapay/framework";
import { CurrencyIdentifier } from "@stustapay/models";

export type CurrencyDenomination = {
  key: string;
  label: string;
  denomination: number;
};

const makeDenominations = (
  currencyIdentifier: string,
  currencySymbol: string,
  denominations: number[]
): CurrencyDenomination[] => {
  return [
    {
      key: "coins",
      label: i18n.t("closeOut.coins"),
      denomination: 1,
    },
  ].concat(
    denominations.map((denomination) => {
      return {
        key: `bill${denomination}${currencyIdentifier}`,
        label: i18n.t("closeOut.bill", { currencySymbol: currencySymbol, denomination }),
        denomination,
      };
    })
  );
};

const euroDenominations: CurrencyDenomination[] = makeDenominations("EUR", "€", [5, 10, 20, 50, 100, 200]);

const usdDenominations: CurrencyDenomination[] = makeDenominations("USD", "$", [1, 2, 5, 10, 20, 50, 100]);

const fallbackDenominations: CurrencyDenomination[] = [
  {
    key: "total",
    label: i18n.t("closeOut.totalCashCount"),
    denomination: 1,
  },
];

const denominationMap: Partial<Record<CurrencyIdentifier, CurrencyDenomination[]>> = {
  EUR: euroDenominations,
  USD: usdDenominations,
};

export const useDenomination = () => {
  const currencyIdentifier = useCurrencyIdentifier();
  return React.useMemo(() => {
    const denominations = denominationMap[currencyIdentifier];
    if (!denominations) {
      console.info(
        `denominiations in ${currencyIdentifier} are currently not supported for detailed cashier close outs`
      );
      return fallbackDenominations;
    }
    return denominations;
  }, [currencyIdentifier]);
};
