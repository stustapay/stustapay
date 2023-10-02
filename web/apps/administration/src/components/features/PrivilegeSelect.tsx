import { Privilege, PrivilegeSchema } from "@stustapay/models";
import {
  SelectProps,
  SelectChangeEvent,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  Box,
  Chip,
  Checkbox,
} from "@mui/material";
import * as React from "react";

export interface PrivilegeSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value: Privilege[];
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (val: Privilege[]) => void;
}

export const PrivilegeSelect: React.FC<PrivilegeSelectProps> = ({
  label,
  value,
  helperText,
  margin,
  onChange,
  error,
  ...props
}) => {
  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    const newVal = evt.target.value;
    if (typeof newVal === "string") {
      onChange(newVal.split(",") as Privilege[]);
      return;
    }

    onChange(newVal as Privilege[]);
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="privilegeSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="privilegeSelectLabel"
        value={value ?? ""}
        multiple
        onChange={handleChange}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {value.map((v) => (
              <Chip key={v} label={v} />
            ))}
          </Box>
        )}
        {...props}
      >
        {PrivilegeSchema.options.map((p) => (
          <MenuItem key={p} value={p}>
            <Checkbox checked={value.includes(p)} />
            {p}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
