import { FormNumericInput, FormSelect, FormTextField } from "@stustapay/form-components";
import { TaxRate, TaxType } from "@stustapay/models";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type TaxRateFormProps<T extends TaxRate> = FormikProps<T>;

const TAX_TYPE_OPTIONS: TaxType[] = ["regular_vat", "reduced_vat", "no_tax", "transparent"];

export function TaxRateForm<T extends TaxRate>(props: TaxRateFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("taxRateName")} formik={props} />
      <FormNumericInput name="rate" label={t("taxRateRate")} formik={props} />
      <FormTextField name="description" label={t("taxRateDescription")} formik={props} />
      <FormSelect
        name="tax_type"
        label={t("taxRateType")}
        formik={props}
        multiple={false}
        options={TAX_TYPE_OPTIONS}
        formatOption={(option: TaxType) => t(`taxRateTypes.${option}`)}
      />
    </>
  );
}
