import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, SelectProps } from "@mui/material";
import { useGetTerminalLayoutsQuery } from "@api";
import * as React from "react";

export interface TerminalLayoutSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value?: number;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (id: number) => void;
}

export const TerminalLayoutSelect: React.FC<TerminalLayoutSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { data: terminalLayouts } = useGetTerminalLayoutsQuery();

  const handleChange = (evt: SelectChangeEvent<number>) => {
    onChange(Number(evt.target.value));
  };

  return (
    <FormControl fullWidth margin={margin}>
      <InputLabel variant={props.variant} id="terminalLayoutSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="terminalLayoutSelectLabel"
        value={value ?? ""}
        onChange={handleChange as any}
        error={error}
        {...props}
      >
        {(terminalLayouts ?? []).map((terminalLayout) => (
          <MenuItem key={terminalLayout.id} value={terminalLayout.id}>
            {terminalLayout.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
