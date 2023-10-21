import { TaxRate, selectTaxRateAll, useListTaxRatesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type TaxRateSelectProps = Omit<
  SelectProps<TaxRate, number, false>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const TaxRateSelect: React.FC<TaxRateSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { taxRates } = useListTaxRatesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        taxRates: data ? selectTaxRateAll(data) : [],
      }),
    }
  );

  return (
    <Select
      multiple={false}
      options={taxRates}
      getOptionKey={(taxRate: TaxRate) => taxRate.id}
      formatOption={(taxRate: TaxRate) => `${taxRate.description} (${taxRate.rate * 100}%)`}
      {...props}
    />
  );
};
