import * as React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  SelectProps,
  FormHelperText,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { ProductRestriction, ProductRestrictions } from "@models";

export interface RestrictionSelectProps
  extends Omit<SelectProps, "value" | "onChange" | "margin" | "multiple" | "renderValue"> {
  label: string;
  value: ProductRestriction[];
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (restrictions: ProductRestriction[]) => void;
}

export const RestrictionSelect: React.FC<RestrictionSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    const val = evt.target.value;
    if (typeof val === "string") {
      onChange(val.split(",") as ProductRestriction[]); // TODO: remove cast
    } else {
      onChange(val as ProductRestriction[]);
    }
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="taxRateSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="taxRateSelectLabel"
        value={value}
        onChange={handleChange}
        renderValue={(selected) => (selected as string[]).join(", ")}
        multiple
        {...props}
      >
        {ProductRestrictions.map((restriction) => (
          <MenuItem key={restriction} value={restriction}>
            <Checkbox checked={value.indexOf(restriction) > -1} />
            <ListItemText primary={restriction} />
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
