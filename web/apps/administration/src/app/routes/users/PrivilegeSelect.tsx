import { PossiblePrivileges, Privilege, PrivilegeSchema } from "@models";
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
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(["users", "common"]);
  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    const newVal = evt.target.value;
    if (typeof newVal !== "string") {
      return;
    }
    if (newVal.includes(",")) {
      onChange(newVal.split(",") as Privilege[]);
      return;
    }

    if (!PrivilegeSchema.safeParse(newVal).success) {
      return;
    }

    if (value.includes(newVal as Privilege)) {
      onChange(value.filter((v) => v !== newVal));
    } else {
      onChange([...value, newVal] as Privilege[]);
    }
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="privilegeSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="privilegeSelectLabel"
        value={value ?? ""}
        onChange={handleChange}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {value.map((v) => (
              <Chip key={v} label={t(v)} />
            ))}
          </Box>
        )}
        {...props}
      >
        {PossiblePrivileges.map((p) => (
          <MenuItem key={p} value={p}>
            {t(p)}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
