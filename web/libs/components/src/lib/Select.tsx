import { Checkbox, FormControlProps, Autocomplete, TextField, AutocompleteProps } from "@mui/material";
import * as React from "react";

export type SelectProps<Option, Multiple extends boolean> = {
  value: Multiple extends true ? Option[] | null : Option | null;
  options: Option[];
  formatOption: Option extends string ? ((v: Option) => string) | undefined : (v: Option) => string;
  onChange: (value: Multiple extends true ? Option[] | null : Option | null) => void;
  multiple: Multiple;
  label: string;
  checkboxes?: boolean;
  chips?: Multiple extends true ? boolean : never;
  variant?: FormControlProps["variant"];
  margin?: FormControlProps["margin"] | "normal";
  helperText?: string;
  error?: boolean;
} & Omit<
  AutocompleteProps<Option, Multiple, false, false>,
  "onChange" | "value" | "multiple" | "renderInput" | "getOptionLabel"
>;

export function Select<Option, Multiple extends boolean>({
  value,
  options,
  label,
  variant,
  margin,
  error,
  checkboxes,
  formatOption,
  multiple,
  chips,
  helperText,
  onChange,
  ...props
}: SelectProps<Option, Multiple>) {
  const handleChange = React.useCallback(
    (event: any, newValue: SelectProps<Option, Multiple>["value"]) => {
      onChange(newValue);
    },
    [onChange]
  );

  const optionToString = React.useCallback(
    (option: Option | undefined) => {
      if (option === undefined) {
        return "";
      } else if (typeof option === "string" && formatOption === undefined) {
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

  return (
    <Autocomplete
      multiple={multiple}
      value={value as any}
      onChange={handleChange as any}
      options={options}
      getOptionLabel={optionToString}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          {multiple && checkboxes && <Checkbox checked={selected} />}
          {optionToString(option)}
        </li>
      )}
      renderInput={(params) => (
        <TextField variant={variant ?? "standard"} label={label} error={error} margin={margin} {...params} />
      )}
      {...props}
    />
  );

  // return (
  //   <FormControl fullWidth variant={"standard" ?? variant} margin={margin} error={error}>
  //     <InputLabel id="roleSelectLabel">{label}</InputLabel>
  //     <MuiSelect
  //       labelId="roleSelectLabel"
  //       value={value == null ? "" : value}
  //       multiple={multiple}
  //       onChange={handleChange}
  //       renderValue={renderValue as any} // TODO: figure out how to get proper typing here
  //       {...props}
  //     >
  //       {options.map((option) => (
  //         <MenuItem key={getOptionKey(option)} value={getOptionKey(option)}>
  //           {multiple && checkboxes && <Checkbox checked={((value ?? []) as Key[]).includes(getOptionKey(option))} />}
  //           {optionToString(option)}
  //         </MenuItem>
  //       ))}
  //     </MuiSelect>
  //     {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
  //   </FormControl>
  // );
}
