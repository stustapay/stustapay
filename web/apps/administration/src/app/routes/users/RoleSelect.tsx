import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  SelectProps,
  FormHelperText,
  Box,
  Chip,
  Checkbox,
} from "@mui/material";
import { useGetUserRolesQuery, selectUserRoleAll } from "@api";
import * as React from "react";

export interface RoleSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value: string[];
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (names: string[]) => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { roles } = useGetUserRolesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      roles: data ? selectUserRoleAll(data) : [],
    }),
  });

  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    const newVal = evt.target.value;
    if (typeof newVal !== "string") {
      return;
    }
    if (newVal.includes(",")) {
      onChange(newVal.split(","));
      return;
    }

    if (value.includes(newVal)) {
      onChange(value.filter((v) => v !== newVal));
    } else {
      onChange([...value, newVal]);
    }
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="roleSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="roleSelectLabel"
        value={value}
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
        {roles.map((role) => (
          <MenuItem key={role.id} value={role.name}>
            <Checkbox checked={value.includes(role.name)} />
            {role.name}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
