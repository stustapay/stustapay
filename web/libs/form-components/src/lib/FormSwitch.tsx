import { FormControl, FormControlLabel, FormHelperText, Switch, SwitchProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormSwitchProps<Values>
  extends Omit<SwitchProps, "value" | "onChange" | "onBlur" | "error" | "helperText"> {
  label: string;
  name: string;
  formik: FormikProps<Values>;
}

// TODO: figure out how to introduce strong typing such that the name must be a key valid for those formik props
export function FormSwitch<Values>({ formik, label, name, ...props }: FormSwitchProps<Values>) {
  const helperText = (formik.touched as any)[name] && (formik.errors as any)[name];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue(name, event.target.checked, true);
    formik.setFieldTouched(name, true);
  };

  return (
    <FormControl error={(formik.touched as any)[name] && !!(formik.errors as any)[name]}>
      <FormControlLabel
        label={label}
        control={<Switch name={name} onChange={handleChange} checked={(formik.values as any)[name]} {...props} />}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
