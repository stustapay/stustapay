import { TaxRate } from "@api";
import { TextField } from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TaxRateFormProps<T extends TaxRate> = FormikProps<T>;

export function TaxRateForm<T extends TaxRate>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TaxRateFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("taxRateName")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

      <NumericInput
        variant="standard"
        margin="normal"
        fullWidth
        name="rate"
        label={t("taxRateRate")}
        error={touched.rate && !!errors.rate}
        helperText={(touched.rate && errors.rate) as string}
        onChange={(value) => setFieldValue("rate", value)}
        value={values.rate}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("taxRateDescription")}
        error={touched.description && !!errors.description}
        helperText={(touched.description && errors.description) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.description}
      />
    </>
  );
}
