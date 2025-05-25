import * as React from "react";
import { DateTimePicker, DateTimePickerProps } from "@mui/x-date-pickers";
import { FormikProps } from "formik";
import { DateTime } from "luxon";

declare module "@mui/x-date-pickers/models" {
  interface PickerValidDateLookup {
    luxon: DateTime;
  }
}

export type FormDateTimePickerProps<Name extends string, Values> = {
  name: Name;
  formik: FormikProps<Values>;
} & Omit<DateTimePickerProps<DateTime>, "value" | "onChange" | "slots" | "value">;

export function FormDateTimePicker<Name extends string, Values extends Partial<Record<Name, string | null>>>({
  name,
  formik,
  ...props
}: FormDateTimePickerProps<Name, Values>) {
  const handleChange = async (value: DateTime | null) => {
    await formik.setFieldValue(name, value?.toISO(), true);
    await formik.setFieldTouched(name, true, false);
  };

  return (
    <DateTimePicker
      value={formik.values[name] != null ? DateTime.fromISO(formik.values[name]!) : null}
      ampm={false}
      onChange={handleChange}
      reduceAnimations
      slotProps={{
        textField: {
          variant: "standard",
          error: formik.touched[name] && !!formik.errors[name],
          helperText: (formik.touched[name] && formik.errors[name]) as string,
        },
      }}
      {...props}
    />
  );
}
