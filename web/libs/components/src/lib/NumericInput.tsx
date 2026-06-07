import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";

export type NumericInputProps = {
  onChange: (value: number | null) => void;
  value?: number | undefined | null;
  preserveDecimalZeros?: boolean;
  decimalPlaces?: number;
  parseOnChange?: boolean;
  integerOnly?: boolean;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  preserveDecimalZeros = true,
  decimalPlaces = 2,
  parseOnChange = false,
  integerOnly = false,
  slotProps,
  inputProps,
  ...props
}) => {
  const [internalValue, setInternalValue] = React.useState("");

  React.useEffect(() => {
    setInternalValue(String(value ?? ""));
  }, [value, setInternalValue]);

  const parseValue = React.useCallback(() => {
    if (internalValue === "") {
      onChange(null);
      return;
    }

    const normalized = integerOnly ? internalValue : internalValue.replace(",", ".");
    const isValidNumber = integerOnly ? /^\d+$/.test(normalized) : /^-?\d*\.?\d*$/.test(normalized);

    if (!isValidNumber) {
      return;
    }

    const parsedValue = integerOnly ? parseInt(normalized, 10) : parseFloat(normalized);

    if (!isNaN(parsedValue)) {
      if (integerOnly) {
        onChange(parsedValue);
        return;
      }

      const roundedValue = Math.round(parsedValue * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
      onChange(roundedValue);
    }
  }, [decimalPlaces, integerOnly, internalValue, onChange]);

  const onInternalChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextValue = event.target.value;
    setInternalValue(nextValue);

    if (parseOnChange) {
      if (nextValue === "") {
        onChange(null);
        return;
      }

      const normalized = integerOnly ? nextValue : nextValue.replace(",", ".");
      const isValidNumber = integerOnly ? /^\d+$/.test(normalized) : /^-?\d*\.?\d*$/.test(normalized);

      if (!isValidNumber) {
        return;
      }

      const parsedValue = integerOnly ? parseInt(normalized, 10) : parseFloat(normalized);
      if (!isNaN(parsedValue)) {
        if (integerOnly) {
          onChange(parsedValue);
          return;
        }

        const roundedValue = Math.round(parsedValue * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
        onChange(roundedValue);
      }
    }
  };

  const onInternalBlur = () => {
    parseValue();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      parseValue();
    }
  };

  const mergedInputProps: NonNullable<TextFieldProps["inputProps"]> = {
    inputMode: integerOnly ? "numeric" : "decimal",
    pattern: integerOnly ? "[0-9]*" : undefined,
    style: { textAlign: "right" as const },
    ...inputProps,
  };

  return (
    <TextField
      value={internalValue}
      onChange={onInternalChange}
      onBlur={onInternalBlur}
      slotProps={slotProps}
      inputProps={mergedInputProps}
      onKeyDown={onKeyDown}
      variant="standard"
      onFocus={(event) => event.target.select()}
      {...props}
    />
  );
};
