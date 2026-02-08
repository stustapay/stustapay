import { NewProduct } from "@/api";
import { RestrictionSelect, TaxRateSelect } from "@/components/features";
import { FormCheckbox, FormCurrencyInput, FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type ProductFormProps<T extends NewProduct> = FormikProps<T>;

export function ProductForm<T extends NewProduct>(props: ProductFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("product.name")} formik={props} />
      <FormCheckbox label={t("product.isReturnable")} name="is_returnable" formik={props} />

      <FormCheckbox
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
          <FormCurrencyInput name="price" label={t("product.price")} formik={props} />
          <FormNumericInput name="price_in_vouchers" label={t("product.priceInVouchers")} formik={props} />
        </>
      )}

      <TaxRateSelect
        label={t("product.taxRate")}
        error={touched.tax_rate_id && !!errors.tax_rate_id}
        helperText={(touched.tax_rate_id && errors.tax_rate_id) as string}
        onChange={(value) => setFieldValue("tax_rate_id", value)}
        value={values.tax_rate_id}
      />

      <RestrictionSelect
        label={t("product.restrictions")}
        multiple={true}
        value={values.restrictions ?? []}
        onChange={(value) => setFieldValue("restrictions", value)}
        error={touched.restrictions && !!errors.restrictions}
        helperText={(touched.restrictions && errors.restrictions) as string}
      />
    </>
  );
}
