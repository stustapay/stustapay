import { FormCheckbox, FormCurrencyInput, FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewProduct } from "@/api";
import { TaxRateSelect, UserTagVariantSelect } from "@/components/features";

export type ProductFormProps<T extends NewProduct> = FormikProps<T>;

export function ProductForm<T extends NewProduct>(props: ProductFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("product.name")} formik={props} />
      <FormCheckbox disabled={values.is_locked} label={t("product.isReturnable")} name="is_returnable" formik={props} />

      <FormCheckbox
        disabled={values.is_locked}
        label={t("product.fixedPrice")}
        name="fixed_price"
        formik={props}
        onChange={(_, checked) => {
          if (!checked) {
            setFieldValue("price", null);
          }
        }}
      />

      {values.fixed_price && (
        <>
          <FormCurrencyInput name="price" label={t("product.price")} formik={props} disabled={values.is_locked} />
          <FormNumericInput
            name="price_in_vouchers"
            label={t("product.priceInVouchers")}
            formik={props}
            disabled={values.is_locked}
          />
        </>
      )}

      <TaxRateSelect
        label={t("product.taxRate")}
        disabled={values.is_locked}
        error={touched.tax_rate_id && !!errors.tax_rate_id}
        helperText={(touched.tax_rate_id && errors.tax_rate_id) as string}
        onChange={(value) => setFieldValue("tax_rate_id", value)}
        value={values.tax_rate_id}
      />

      <UserTagVariantSelect
        label={t("product.userTagVariants")}
        multiple={true}
        value={values.user_tag_variant_ids ?? []}
        disabled={values.is_locked}
        onChange={(value) => setFieldValue("user_tag_variant_ids", value)}
        error={touched.user_tag_variant_ids && !!errors.user_tag_variant_ids}
        helperText={(touched.user_tag_variant_ids && errors.user_tag_variant_ids) as string}
      />
    </>
  );
}
