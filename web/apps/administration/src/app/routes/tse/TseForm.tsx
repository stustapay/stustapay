import { NewTse } from "@/api";
import { InputAdornment } from "@mui/material";
import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TseFormProps<T extends NewTse> = FormikProps<T>;

export function TseForm<T extends NewTse>(props: TseFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <FormTextField margin="normal" autoFocus name="name" label={t("tse.name")} formik={props} />
      <FormTextField margin="normal" name="serial" label={t("tse.serial")} formik={props} />
      <FormTextField margin="normal" name="ws_url" label={t("tse.wsUrl")} formik={props} />
      <FormNumericInput
        margin="normal"
        name="ws_timeout"
        label={t("tse.wsTimeout")}
        InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
        formik={props}
      />
      <FormTextField margin="normal" name="password" label={t("tse.password")} formik={props} />
    </>
  );
}
