import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  SelectProps,
  FormHelperText,
} from "@mui/material";
import { useGetTillProfilesQuery } from "@api";
import * as React from "react";

export interface TillProfileSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value?: number | null;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (id: number) => void;
}

export const TillProfileSelect: React.FC<TillProfileSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { data: tillProfiles } = useGetTillProfilesQuery();

  const handleChange = (evt: SelectChangeEvent<number>) => {
    onChange(Number(evt.target.value));
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="tillProfileSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="tillProfileSelectLabel"
        value={value != null ? value : ""}
        onChange={handleChange as any}
        {...props}
      >
        {(tillProfiles ?? []).map((tillProfile) => (
          <MenuItem key={tillProfile.id} value={tillProfile.id}>
            {tillProfile.name}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
