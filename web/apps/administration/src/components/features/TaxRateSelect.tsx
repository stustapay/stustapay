import { TaxRate, selectTaxRateAll, useListTaxRatesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export interface TaxRateSelectProps extends Omit<
  SelectProps<TaxRate, false>,
  "options" | "formatOption" | "multiple" | "value" | "onChange"
> {
  value: number;
  onChange: (taxRateId: number) => void;
}

export const TaxRateSelect: React.FC<TaxRateSelectProps> = ({ value, onChange, ...props }) => {
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

  const handleChange = React.useCallback(
    (taxRate: TaxRate | null) => {
      if (taxRate != null) {
        onChange(taxRate.id);
      }
    },
    [onChange]
  );

  const selected = React.useMemo(() => taxRates.find((t) => t.id === value) ?? null, [value, taxRates]);

  return (
    <Select
      multiple={false}
      options={taxRates}
      onChange={handleChange}
      value={selected}
      formatOption={(taxRate: TaxRate) => `${taxRate.description} (${taxRate.rate * 100}%)`}
      {...props}
    />
  );
};
