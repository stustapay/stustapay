import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";

export type CashingTextFieldProps = {
  onChange: (value: string) => void;
  value?: string | undefined | null;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const CashingTextField: React.FC<CashingTextFieldProps> = ({ value, onChange, ...props }) => {
  const [internalValue, setInternalValue] = React.useState("");

  React.useEffect(() => {
    setInternalValue(value ?? "");
  }, [value, setInternalValue]);

  const onInternalChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInternalValue(event.target.value);
  };

  const propagateChange = () => {
    onChange(internalValue);
  };

  const onInternalBlur = () => {
    propagateChange();
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      propagateChange();
    }
  };

  return (
    <TextField value={internalValue} onChange={onInternalChange} onBlur={onInternalBlur} onKeyUp={onKeyUp} {...props} />
  );
};
