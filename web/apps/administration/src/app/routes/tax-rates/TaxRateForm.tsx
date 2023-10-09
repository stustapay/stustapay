import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { TaxRate } from "@stustapay/models";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TaxRateFormProps<T extends TaxRate> = FormikProps<T>;

export function TaxRateForm<T extends TaxRate>(props: TaxRateFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <FormTextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("taxRateName")}
        formik={props}
      />

      <FormNumericInput
        variant="standard"
        margin="normal"
        fullWidth
        name="rate"
        label={t("taxRateRate")}
        formik={props}
      />

      <FormTextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("taxRateDescription")}
        formik={props}
      />
    </>
  );
}
