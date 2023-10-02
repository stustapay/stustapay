import { NewTse } from "@/api";
import { InputAdornment, TextField } from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TseFormProps<T extends NewTse> = FormikProps<T>;

export function TseForm<T extends NewTse>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TseFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("tse.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="serial"
        label={t("tse.serial")}
        error={touched.serial && !!errors.serial}
        helperText={(touched.serial && errors.serial) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.serial}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="ws_url"
        label={t("tse.wsUrl")}
        error={touched.ws_url && !!errors.ws_url}
        helperText={(touched.ws_url && errors.ws_url) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.ws_url}
      />

      <NumericInput
        variant="standard"
        margin="normal"
        fullWidth
        name="ws_timeout"
        label={t("tse.wsTimeout")}
        InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
        error={touched.ws_timeout && !!errors.ws_timeout}
        helperText={(touched.ws_timeout && errors.ws_timeout) as string}
        onChange={(value) => setFieldValue("ws_timeout", value)}
        value={values.ws_timeout}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="password"
        label={t("tse.password")}
        error={touched.password && !!errors.password}
        helperText={(touched.password && errors.password) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.password}
      />
    </>
  );
}
