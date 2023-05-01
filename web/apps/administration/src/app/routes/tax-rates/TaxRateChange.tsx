import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { TaxRate } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { NumericInput } from "@components/NumericInput";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";

export interface TaxRateChangeProps<T extends TaxRate> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TaxRateChange<T extends TaxRate>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TaxRateChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation(["taxRates", "common"]);
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/tax-rates");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in tax rate update", err);
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
