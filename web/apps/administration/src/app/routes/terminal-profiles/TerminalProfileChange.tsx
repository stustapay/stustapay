import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewTerminalProfile } from "@models";
import { TerminalLayoutSelect } from "./TerminalLayoutSelect";

export interface TerminalChangeProps<T extends NewTerminalProfile> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TerminalProfileChange<T extends NewTerminalProfile>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TerminalChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation(["terminals", "common"]);
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/terminal-profiles");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in terminal profile update", err);
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
              label={t("profile.name")}
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
              label={t("profile.description")}
              error={touched.description && !!errors.description}
              helperText={(touched.description && errors.description) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.description}
            />

            <TerminalLayoutSelect
              name="layout"
              margin="normal"
              variant="standard"
              label={t("layout.layout")}
              error={touched.layout_id && !!errors.layout_id}
              helperText={(touched.layout_id && errors.layout_id) as string}
              onChange={(value) => setFieldValue("layout_id", value)}
              value={values.layout_id}
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
