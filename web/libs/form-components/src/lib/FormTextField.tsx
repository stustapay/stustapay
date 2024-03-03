import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormTextFieldProps<Name extends string, Values>
  extends Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "error" | "helperText"> {
  name: Name;
  formik: FormikProps<Values>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FormTextFieldInner<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  name,
  ...props
}: FormTextFieldProps<Name, Values>) {
  return (
    <TextField
      name={name}
      variant={props.variant ?? "standard"}
      fullWidth={props.fullWidth ?? true}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      value={formik.values[name] ?? ""}
      error={formik.touched[name] && !!formik.errors[name]}
      helperText={(formik.touched[name] && formik.errors[name]) as string}
      {...props}
    />
  );
}

export const FormTextField = React.memo(FormTextFieldInner) as typeof FormTextFieldInner;
