import * as React from "react";
import { TimePicker, TimePickerProps } from "@mui/x-date-pickers";
import { FormikProps } from "formik";
import { TextField } from "@mui/material";
import { DateTime } from "luxon";

export type FormTimePickerProps<Name extends string, Values> = {
  name: Name;
  formik: FormikProps<Values>;
} & Omit<TimePickerProps<DateTime>, "value" | "onChange" | "slots" | "value">;

export function FormTimePicker<Name extends string, Values extends Partial<Record<Name, string | null>>>({
  name,
  formik,
  ...props
}: FormTimePickerProps<Name, Values>) {
  const handleChange = (value: DateTime | null) => {
    formik.setFieldValue(name, value?.toISOTime(), true);
    formik.setFieldTouched(name, true, false);
  };

  return (
    <TimePicker
      value={formik.values[name] != null ? DateTime.fromISO(formik.values[name]!) : null}
      ampm={false}
      onChange={handleChange}
      slots={{
        textField: (props) => (
          <TextField
            variant="standard"
            error={formik.touched[name] && !!formik.errors[name]}
            helperText={(formik.touched[name] && formik.errors[name]) as string}
            {...props}
          />
        ),
      }}
      {...props}
    />
  );
}
