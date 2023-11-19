import { Select, SelectProps } from "@stustapay/components";
import { FormikProps } from "formik";

export type FormSelectProps<Values, Option, Multiple extends boolean> = {
  name: string;
  formik: FormikProps<Values>;
} & Omit<SelectProps<Option, Multiple>, "onChange" | "error" | "helperText" | "value">;

export function FormSelect<Values, Option, Multiple extends boolean>({
  formik,
  name,
  ...props
}: FormSelectProps<Values, Option, Multiple>) {
  const handleChange = (value: unknown) => {
    formik.setFieldValue(name, value);
    formik.setFieldTouched(name);
  };

  return (
    <Select
      variant={props.variant ?? "standard"}
      fullWidth={props.fullWidth ?? true}
      onChange={handleChange}
      value={(formik.values as any)[name]}
      error={(formik.touched as any)[name] && !!(formik.errors as any)[name]}
      helperText={(formik.touched as any)[name] && (formik.errors as any)[name]}
      {...props}
    />
  );
}
