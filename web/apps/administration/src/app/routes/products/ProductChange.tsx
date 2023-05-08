import {
  Paper,
  TextField,
  Button,
  LinearProgress,
  Typography,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { NewProduct } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { TaxRateSelect } from "./TaxRateSelect";
import { NumericInput } from "@components";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { RestrictionSelect } from "./RestrictionSelect";
import { useCurrencySymbol } from "@hooks";

export interface ProductChangeProps<T extends NewProduct> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (p: T) => MutationActionCreatorResult<any>;
}

export function ProductChange<T extends NewProduct>({
  headerTitle,
  initialValues,
  submitLabel,
  validationSchema,
  onSubmit,
}: ProductChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation(["products", "common"]);
  const currencySymbol = useCurrencySymbol();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/products");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error", err);
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{headerTitle}</Typography>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(validationSchema)}
      >
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
          <Form onSubmit={handleSubmit}>
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
              label={t("isReturnable")}
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
              label={t("fixedPrice")}
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
              value={values.restrictions}
              disabled={values.is_locked}
              onChange={(value) => setFieldValue("restrictions", value)}
              error={touched.restrictions && !!errors.restrictions}
              helperText={(touched.restrictions && errors.restrictions) as string}
            />

            {isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
              {submitLabel}
            </Button>
          </Form>
        )}
      </Formik>
    </Paper>
  );
}
