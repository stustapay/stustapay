import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";

export type NumericInputProps = {
  onChange: (value: number | null) => void;
  value?: number | undefined | null;
  preserveDecimalZeros?: boolean;
  decimalPlaces?: number;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const NumericInput: React.FC<NumericInputProps> = ({ 
  value, 
  onChange, 
  preserveDecimalZeros = true,
  decimalPlaces = 2,
  ...props 
}) => {
  const [internalValue, setInternalValue] = React.useState("");

  React.useEffect(() => {
    setInternalValue(String(value ?? ""));
  }, [value, setInternalValue]);

  const onInternalChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInternalValue(event.target.value);
  };

  const propagateChange = () => {
    if (internalValue === "") {
      onChange(null);
      return;
    }

    // Accept both comma and period as decimal separators
    const normalized = internalValue.replace(",", ".");
    
    // Only parse if it's a valid number
    if (/^-?\d*\.?\d*$/.test(normalized)) {
      // Parse the value and round to specified decimal places
      const parsedValue = parseFloat(normalized);
      
      if (!isNaN(parsedValue)) {
        // Round to the specified number of decimal places
        const roundedValue = Math.round(parsedValue * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
        onChange(roundedValue);
      }
    }
  };

  const onInternalBlur = () => {
    propagateChange();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      propagateChange();
    }
  };

  return (
    <TextField
      value={internalValue}
      onChange={onInternalChange}
      onBlur={onInternalBlur}
      slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
      onKeyDown={onKeyDown}
      variant="standard"
      onFocus={(event) => event.target.select()}
      {...props}
    />
  );
};
