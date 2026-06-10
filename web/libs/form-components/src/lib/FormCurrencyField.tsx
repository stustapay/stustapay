import { InputAdornment } from "@mui/material";
import { useCurrencySymbol } from "@stustapay/framework";
import * as React from "react";

import { FormNumericInput, FormNumericInputProps } from "./FormNumericField";

export type FormCurrencyInputProps<Name extends string, Values> = FormNumericInputProps<Name, Values>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormCurrencyInput<Name extends string, Values extends Partial<Record<Name, any>>>({
  slotProps,
  ...props
}: FormNumericInputProps<Name, Values>) {
  const currencySymbol = useCurrencySymbol();
  const actualSlotProps = {
    ...slotProps,
    input: {
      ...slotProps?.input,
      endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment>,
    },
  };
  return <FormNumericInput {...props} slotProps={actualSlotProps} />;
}
