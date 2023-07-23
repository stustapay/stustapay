import { Button, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewCashRegister } from "@api";

export interface TillRegisterChangeProps<T extends NewCashRegister> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TillRegisterChange<T extends NewCashRegister>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TillRegisterChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/till-registers");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in till register stocking update", err);
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
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched }) => (
          <Form onSubmit={handleSubmit}>
            <TextField
              variant="standard"
              margin="normal"
              fullWidth
              autoFocus
              name="name"
              label={t("register.name")}
              error={touched.name && !!errors.name}
              helperText={(touched.name && errors.name) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.name}
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
