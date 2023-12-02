import { Select, SelectProps } from "@stustapay/components";
import { CurrencyIdentifier, CurrencyIdentifiers, getCurrencySymbolForIdentifier } from "@stustapay/models";
import * as React from "react";

export type CurrencyIdentifierSelectProps = Omit<
  SelectProps<CurrencyIdentifier, false>,
  "options" | "formatOption" | "multiple"
>;

export const CurrencyIdentifierSelect: React.FC<CurrencyIdentifierSelectProps> = (props) => {
  return (
    <Select
      multiple={false}
      options={CurrencyIdentifiers}
      formatOption={(identifier: CurrencyIdentifier) => `${identifier} (${getCurrencySymbolForIdentifier(identifier)})`}
      {...props}
    />
  );
};
