import { Select, SelectProps } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { TaxRate } from "@/api";
import { getTaxRateCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export interface TaxRateSelectProps extends Omit<
  SelectProps<TaxRate, false>,
  "options" | "formatOption" | "multiple" | "value" | "onChange"
> {
  value: number;
  onChange: (taxRateId: number) => void;
}

export const TaxRateSelect: React.FC<TaxRateSelectProps> = ({ value, onChange, ...props }) => {
  const { currentNode } = useCurrentNode();
  const { data: taxRates } = useLiveQuery(
    (q) => q.from({ taxRates: getTaxRateCollection(currentNode.id) }),
    [currentNode.id]
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
