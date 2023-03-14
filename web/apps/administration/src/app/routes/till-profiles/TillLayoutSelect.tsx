import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  SelectProps,
  FormHelperText,
} from "@mui/material";
import { useGetTillLayoutsQuery } from "@api";
import * as React from "react";

export interface TillLayoutSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value?: number;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (id: number) => void;
}

export const TillLayoutSelect: React.FC<TillLayoutSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { data: tillLayouts } = useGetTillLayoutsQuery();

  const handleChange = (evt: SelectChangeEvent<number>) => {
    onChange(Number(evt.target.value));
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="tillLayoutSelectLabel">
        {label}
      </InputLabel>
      <Select labelId="tillLayoutSelectLabel" value={value ?? ""} onChange={handleChange as any} {...props}>
        {(tillLayouts ?? []).map((tillLayout) => (
          <MenuItem key={tillLayout.id} value={tillLayout.id}>
            {tillLayout.name}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
