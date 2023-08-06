import { NewProduct } from "@/api";
import { RestrictionSelect, TaxRateSelect } from "@/components/features";
import { useCurrencySymbol } from "@/hooks";
import { Checkbox, FormControlLabel, InputAdornment, TextField } from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type ProductFormProps<T extends NewProduct> = FormikProps<T>;

export function ProductForm<T extends NewProduct>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: ProductFormProps<T>) {
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol();

  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("product.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

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
          <NumericInput
            variant="standard"
            margin="normal"
            fullWidth
            name="price"
            label={t("product.price")}
            disabled={values.is_locked}
            InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
            error={touched.price && !!errors.price}
            helperText={(touched.price && errors.price) as string}
            onChange={(value) => setFieldValue("price", value)}
            value={values.price}
          />
          <NumericInput
            variant="standard"
            margin="normal"
            fullWidth
            name="price_in_vouchers"
            label={t("product.priceInVouchers")}
            disabled={values.is_locked}
            error={touched.price_in_vouchers && !!errors.price_in_vouchers}
            helperText={(touched.price_in_vouchers && errors.price_in_vouchers) as string}
            onChange={(value) => setFieldValue("price_in_vouchers", value)}
            value={values.price_in_vouchers}
          />
        </>
      )}

      <TaxRateSelect
        name="tax"
        margin="normal"
        variant="standard"
        label={t("product.taxRate")}
        disabled={values.is_locked}
        error={touched.tax_name && !!errors.tax_name}
        helperText={(touched.tax_name && errors.tax_name) as string}
        onChange={(value) => setFieldValue("tax_name", value)}
        value={values.tax_name}
      />

      <RestrictionSelect
        label={t("product.restrictions")}
        margin="normal"
        variant="standard"
        value={values.restrictions ?? []}
        disabled={values.is_locked}
        onChange={(value) => setFieldValue("restrictions", value)}
        error={touched.restrictions && !!errors.restrictions}
        helperText={(touched.restrictions && errors.restrictions) as string}
      />
    </>
  );
}
