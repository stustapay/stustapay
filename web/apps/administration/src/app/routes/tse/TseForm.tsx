import { NewTse } from "@/api";
import { InputAdornment } from "@mui/material";
import { FormDateTimePicker, FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TseFormProps<T extends NewTse> = FormikProps<T>;

export function TseForm<T extends NewTse>(props: TseFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("tse.name")} formik={props} />
      <FormTextField name="serial" label={t("tse.serial")} formik={props} />
      <FormTextField name="ws_url" label={t("tse.wsUrl")} formik={props} />
      <FormNumericInput
        name="ws_timeout"
        label={t("tse.wsTimeout")}
        slotProps={{ input: { endAdornment: <InputAdornment position="end">s</InputAdornment> } }}
        formik={props}
      />
      <FormTextField name="password" label={t("tse.password")} formik={props} />
      <FormDateTimePicker name="first_operation" label={t("tse.firstOperation")} formik={props} />
    </>
  );
}
