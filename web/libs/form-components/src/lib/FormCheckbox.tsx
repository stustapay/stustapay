import { FormControl, FormControlLabel, FormHelperText, Checkbox, CheckboxProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormCheckboxProps<Name extends string, Values>
  extends Omit<CheckboxProps, "value" | "onBlur" | "error" | "helperText"> {
  label: React.ReactNode;
  name: Name;
  formik: FormikProps<Values>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormCheckbox<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  label,
  name,
  onChange,
  ...props
}: FormCheckboxProps<Name, Values>) {
  const helperText = (formik.touched[name] && formik.errors[name]) as string | undefined;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    formik.setFieldValue(name, checked, true);
    formik.setFieldTouched(name, true);
    onChange?.(event, checked);
  };

  return (
    <FormControl error={formik.touched[name] && !!formik.errors[name]}>
      <FormControlLabel
        label={label}
        control={<Checkbox name={name} onChange={handleChange} checked={formik.values[name]} {...props} />}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
