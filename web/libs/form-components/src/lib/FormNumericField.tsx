import * as React from "react";
import { NumericInput, NumericInputProps } from "@stustapay/components";
import { FormikProps } from "formik";

export interface FormNumericInputProps<Name extends string, Values>
  extends Omit<NumericInputProps, "value" | "onChange" | "error" | "helperText"> {
  name: Name;
  formik: FormikProps<Values>;
}

const MemoizedNumericInput = React.memo(NumericInput);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormNumericInput<Name extends string, Values extends Partial<Record<Name, any>>>({
  formik,
  name,
  ...props
}: FormNumericInputProps<Name, Values>) {
  const { setFieldValue, setFieldTouched } = formik;

  const handleChange = React.useCallback(
    (value: number | null) => {
      setFieldValue(name, value, true);
      setFieldTouched(name, true, false);
    },
    [setFieldValue, setFieldTouched, name]
  );

  return (
    <MemoizedNumericInput
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
