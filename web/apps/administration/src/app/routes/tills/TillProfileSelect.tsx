import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
} from "@mui/material";
import { selectTillProfileAll, useListTillProfilesQuery } from "@api";
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
  const { profiles } = useListTillProfilesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      profiles: data ? selectTillProfileAll(data) : [],
    }),
  });

  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    if (!isNaN(Number(evt.target.value))) {
      onChange(Number(evt.target.value));
    }
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="tillProfileSelectLabel">
        {label}
      </InputLabel>
      <Select labelId="tillProfileSelectLabel" value={value != null ? value : ""} onChange={handleChange} {...props}>
        {profiles.map((profile) => (
          <MenuItem key={profile.id} value={profile.id}>
            {profile.name}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
