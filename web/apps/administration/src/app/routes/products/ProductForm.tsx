import { NewProduct } from "@/api";
import { RestrictionSelect, TaxRateSelect } from "@/components/features";
import { useCurrencySymbol } from "@/hooks";
import { Checkbox, FormControlLabel, InputAdornment } from "@mui/material";
import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type ProductFormProps<T extends NewProduct> = FormikProps<T>;

export function ProductForm<T extends NewProduct>(props: ProductFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("product.name")} formik={props} />

      <FormControlLabel
        label={t("product.isReturnable")}
        control={
          <Checkbox
            checked={values.is_returnable}
            disabled={values.is_locked}
            onChange={(evt) => {
              const checked = evt.target.checked;
              setFieldValue("is_returnable", checked);
            }}
          />
        }
      />

      <FormControlLabel
        label={t("product.fixedPrice")}
        control={
          <Checkbox
            checked={values.fixed_price}
            disabled={values.is_locked}
            onChange={(evt) => {
              const checked = evt.target.checked;
              setFieldValue("fixed_price", checked);
              if (!checked) {
                setFieldValue("price", null);
              }
            }}
          />
        }
      />

      {values.fixed_price && (
        <>
          <FormNumericInput
            name="price"
            label={t("product.price")}
            formik={props}
            disabled={values.is_locked}
            InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
          />
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

      <RestrictionSelect
        label={t("product.restrictions")}
        multiple={true}
        value={values.restrictions ?? []}
        disabled={values.is_locked}
        onChange={(value) => setFieldValue("restrictions", value)}
        error={touched.restrictions && !!errors.restrictions}
        helperText={(touched.restrictions && errors.restrictions) as string}
      />
    </>
  );
}
