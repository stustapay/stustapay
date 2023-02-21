import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, SelectProps } from "@mui/material";
import { useGetTerminalProfilesQuery } from "@api";
import * as React from "react";

export interface TerminalProfileSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value?: number | null;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (id: number) => void;
}

export const TerminalProfileSelect: React.FC<TerminalProfileSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { data: terminalProfiles } = useGetTerminalProfilesQuery();

  const handleChange = (evt: SelectChangeEvent<number>) => {
    onChange(Number(evt.target.value));
  };

  return (
    <FormControl fullWidth margin={margin}>
      <InputLabel variant={props.variant} id="terminalProfileSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="terminalProfileSelectLabel"
        value={value != null ? value : ""}
        onChange={handleChange as any}
        error={error}
        {...props}
      >
        {(terminalProfiles ?? []).map((terminalProfile) => (
          <MenuItem key={terminalProfile.id} value={terminalProfile.id}>
            {terminalProfile.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
