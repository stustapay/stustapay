import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewTillLayout } from "@stustapay/models";
import { TillLayoutDesigner } from "./TillLayoutDesigner";

export interface TillChangeProps<T extends NewTillLayout> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TillLayoutChange<T extends NewTillLayout>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TillChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation(["tills", "common"]);

  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/till-layouts");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in till update", err);
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(validationSchema)}
    >
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
        <Form onSubmit={handleSubmit}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5">{headerTitle}</Typography>
            <TextField
              variant="standard"
              margin="normal"
              fullWidth
              autoFocus
              name="name"
              label={t("layout.name")}
              error={touched.name && !!errors.name}
              helperText={(touched.name && errors.name) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.name}
            />

            <TextField
              variant="standard"
              margin="normal"
              fullWidth
              name="description"
              label={t("layout.description")}
              error={touched.description && !!errors.description}
              helperText={(touched.description && errors.description) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.description}
            />
          </Paper>
          <Paper sx={{ mt: 2 }}>
            <TillLayoutDesigner
              buttonIds={values.button_ids === null ? [] : values.button_ids}
              onChange={(buttonIds) => setFieldValue("button_ids", buttonIds)}
            />
          </Paper>
          <Paper sx={{ mt: 2, p: 2 }}>
            {isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
              {submitLabel}
            </Button>
          </Paper>
        </Form>
      )}
    </Formik>
  );
}
