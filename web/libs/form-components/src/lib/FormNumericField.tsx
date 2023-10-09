import { NumericInput, NumericInputProps } from "@stustapay/components";
import { FormikProps } from "formik";

export interface FormNumericInputProps<Values>
  extends Omit<NumericInputProps, "value" | "onChange" | "error" | "helperText"> {
  name: string;
  formik: FormikProps<Values>;
}

// TODO: figure out how to introduce strong typing such that the name must be a key valid for those formik props
export function FormNumericInput<Values>({ formik, name, ...props }: FormNumericInputProps<Values>) {
  return (
    <NumericInput
      name={name}
      variant={props.variant ?? "standard"}
      fullWidth={props.fullWidth ?? true}
      onChange={formik.handleChange}
      value={(formik.values as any)[name]}
      error={(formik.touched as any)[name] && !!(formik.errors as any)[name]}
      helperText={(formik.touched as any)[name] && (formik.errors as any)[name]}
      {...props}
    />
  );
}
