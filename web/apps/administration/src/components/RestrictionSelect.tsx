import * as React from "react";
import {
  Checkbox,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
} from "@mui/material";
import { ProductRestrictions } from "@stustapay/models";
import { ProductRestriction } from "@api";

export interface RestrictionSelectProps
  extends Omit<SelectProps, "value" | "onChange" | "margin" | "multiple" | "renderValue"> {
  label: string;
  multiple?: boolean;
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
  multiple = true,
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
      <InputLabel variant={props.variant} id="restrictionSelectLabel">
        {label}
      </InputLabel>
      <Select
        labelId="restrictionSelectLabel"
        value={value}
        onChange={handleChange}
        renderValue={(selected) => (selected as string[]).join(", ")}
        multiple={multiple}
        {...props}
      >
        {ProductRestrictions.map((restriction) => (
          <MenuItem key={restriction} value={restriction}>
            {multiple && <Checkbox checked={value.includes(restriction)} />}
            <ListItemText primary={restriction} />
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
