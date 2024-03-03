import * as React from "react";
import { NumericInput, NumericInputProps } from "@stustapay/components";
import { FormikProps } from "formik";

export interface FormNumericInputProps<Name extends string, Values>
  extends Omit<NumericInputProps, "value" | "onChange" | "error" | "helperText"> {
  name: Name;
  formik: FormikProps<Values>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FormNumericInputInner<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  name,
  ...props
}: FormNumericInputProps<Name, Values>) {
  const handleChange = (value: number | null) => {
    formik.setFieldValue(name, value, true);
    formik.setFieldTouched(name, true, false);
  };

  return (
    <NumericInput
      name={name}
      variant={props.variant ?? "standard"}
      fullWidth={props.fullWidth ?? true}
      onChange={handleChange}
      value={formik.values[name]}
      error={formik.touched[name] && !!formik.errors[name]}
      helperText={(formik.touched[name] && formik.errors[name]) as string}
      {...props}
    />
  );
}

export const FormNumericInput = React.memo(FormNumericInputInner) as typeof FormNumericInputInner;
