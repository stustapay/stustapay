import * as React from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { FormikProps } from "formik";

export interface FormTextFieldProps<Name extends string, Values>
  extends Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "error" | "helperText"> {
  name: Name;
  formik: FormikProps<Values>;
}

const MemoizedTextField = React.memo(TextField);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormTextField<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  name,
  ...props
}: FormTextFieldProps<Name, Values>) {
  return (
    <MemoizedTextField
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
