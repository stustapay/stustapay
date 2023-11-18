import { Select, SelectProps } from "@stustapay/components";
import { FormikProps } from "formik";

export type FormSelectProps<Values, Option, Key extends string | number, Multiple extends boolean> = {
  name: string;
  formik: FormikProps<Values>;
} & Omit<SelectProps<Option, Key, Multiple>, "onChange" | "error" | "helperText" | "value">;

export function FormSelect<Values, Option, Key extends string | number, Multiple extends boolean>({
  formik,
  name,
  ...props
}: FormSelectProps<Values, Option, Key, Multiple>) {
  const handleChange = (value: unknown) => {
    formik.setFieldValue(name, value);
    formik.setFieldTouched(name);
  };

  return (
    <Select
      name={name}
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
