import { FormControl, FormControlLabel, FormHelperText, Switch, SwitchProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormSwitchProps<Name extends string, Values> extends Omit<
  SwitchProps,
  "value" | "onChange" | "onBlur" | "error" | "helperText"
> {
  label: string;
  name: Name;
  formik: FormikProps<Values>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormSwitch<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  label,
  name,
  ...props
}: FormSwitchProps<Name, Values>) {
  const helperText = (formik.touched[name] && formik.errors[name]) as string | undefined;

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await formik.setFieldValue(name, event.target.checked, true);
    await formik.setFieldTouched(name, true);
  };

  return (
    <FormControl error={formik.touched[name] && !!formik.errors[name]}>
      <FormControlLabel
        label={label}
        control={<Switch name={name} onChange={handleChange} checked={formik.values[name]} {...props} />}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
