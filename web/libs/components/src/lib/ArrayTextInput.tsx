import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";

export type ArrayTextInputProps = {
  onChange: (value: number[] | null) => void;
  value?: number[] | undefined | null;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const ArrayTextInput: React.FC<ArrayTextInputProps> = ({ value, onChange, ...props }) => {
  const [internalValue, setInternalValue] = React.useState("");

  React.useEffect(() => {
    setInternalValue(value?.join(",") ?? "");
  }, [value, setInternalValue]);

  const onInternalChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInternalValue(event.target.value);
  };

  const propagateChange = () => {
    if (internalValue === "") {
      onChange(null);
      return;
    }

    const transformedValue = internalValue
      .split(",")
      .map((entry) => Number(entry))
      .filter((entry) => !Number.isNaN(entry));

    // TODO: proper validation
    setInternalValue(transformedValue.join(","));
    onChange(transformedValue);
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
      onKeyDown={onKeyDown}
      variant="standard"
      {...props}
    />
  );
};
