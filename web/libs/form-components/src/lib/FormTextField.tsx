import { TextField, TextFieldProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormTextFieldProps<Values>
  extends Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "error" | "helperText"> {
  name: string;
  formik: FormikProps<Values>;
}

// TODO: figure out how to introduce strong typing such that the name must be a key valid for those formik props
export function FormTextField<Values>({ formik, name, ...props }: FormTextFieldProps<Values>) {
  return (
    <TextField
      name={name}
      variant={props.variant ?? "standard"}
      fullWidth={props.fullWidth ?? true}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      value={(formik.values as any)[name]}
      error={(formik.touched as any)[name] && !!(formik.errors as any)[name]}
      helperText={(formik.touched as any)[name] && (formik.errors as any)[name]}
      {...props}
    />
  );
}
