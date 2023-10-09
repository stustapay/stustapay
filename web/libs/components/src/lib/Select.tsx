import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlProps,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  SelectChangeEvent,
} from "@mui/material";
import * as React from "react";

export type SelectProps<Option, Key extends number | string, Multiple extends boolean> = {
  value: Multiple extends true ? Key[] | null : Key | null;
  options: Option[];
  formatOption: Option extends string ? ((v: Option) => string) | undefined : (v: Option) => string;
  onChange: (value: Multiple extends true ? Key[] : Key) => void;
  getOptionKey: (option: Option) => Key;
  multiple: Multiple;
  label: string;
  checkboxes?: boolean;
  chips?: Multiple extends true ? boolean : never;
  variant?: FormControlProps["variant"];
  margin?: FormControlProps["margin"] | "normal";
  helperText?: string;
  error?: boolean;
} & Omit<MuiSelectProps, "renderValue" | "onChange" | "value" | "multiple" | "labelId" | "margin">;

export function Select<Option, Key extends number | string, Multiple extends boolean>({
  value,
  options,
  label,
  variant,
  margin,
  error,
  checkboxes,
  formatOption,
  getOptionKey,
  multiple,
  chips,
  helperText,
  onChange,
  ...props
}: SelectProps<Option, Key, Multiple>) {
  const handleChange = React.useCallback(
    (evt: SelectChangeEvent<unknown>) => {
      const newVal = evt.target.value;
      onChange(newVal as any); // TODO: typing
    },
    [onChange]
  );

  const optionToString = React.useCallback(
    (option: Option) => {
      if (typeof option === "string" && formatOption === undefined) {
        return option;
      } else {
        if (!formatOption) {
          throw new Error("invalid code path, type system should not allow this to happen");
        }
        return formatOption(option);
      }
    },
    [formatOption]
  );

  const optionFromKey = React.useCallback(
    (key: Key): Option => {
      return options.find((option) => getOptionKey(option) === key)!;
    },
    [options, getOptionKey]
  );

  const renderValue = React.useMemo(() => {
    if (multiple) {
      if (chips) {
        return (v: Key[]): React.ReactNode => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {v.map((v) => {
              const option = optionFromKey(v);
              return <Chip key={v} label={optionToString(option)} />;
            })}
          </Box>
        );
      } else {
        return (val: Key[]) => val.map((v) => optionToString(optionFromKey(v))).join(", ");
      }
    } else {
      return (v: Key) => optionToString(optionFromKey(v));
    }
  }, [chips, multiple, optionToString, optionFromKey]);

  return (
    <FormControl fullWidth variant={"standard" ?? variant} margin={margin} error={error}>
      <InputLabel id="roleSelectLabel">{label}</InputLabel>
      <MuiSelect
        labelId="roleSelectLabel"
        value={value === null ? "" : value}
        multiple={multiple}
        onChange={handleChange}
        renderValue={renderValue as any} // TODO: figure out how to get proper typing here
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={getOptionKey(option)} value={getOptionKey(option)}>
            {multiple && checkboxes && <Checkbox checked={((value ?? []) as Key[]).includes(getOptionKey(option))} />}
            {optionToString(option)}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
}
