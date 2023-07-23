import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewTillProfile } from "@api";
import { TillLayoutSelect } from "./TillLayoutSelect";
import { RoleSelect } from "../users/RoleSelect";

export interface TillChangeProps<T extends NewTillProfile> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TillProfileChange<T extends NewTillProfile>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TillChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/till-profiles");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in till profile update", err);
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

            <FormGroup>
              <FormControlLabel
                control={<Checkbox name="allow_top_up" checked={values.allow_top_up} onChange={handleChange} />}
                label={t("profile.allowTopUp")}
              />
            </FormGroup>

            <FormGroup>
              <FormControlLabel
                control={<Checkbox name="allow_cash_out" checked={values.allow_cash_out} onChange={handleChange} />}
                label={t("profile.allowCashOut")}
              />
            </FormGroup>

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox name="allow_ticket_sale" checked={values.allow_ticket_sale} onChange={handleChange} />
                }
                label={t("profile.allowTicketSale")}
              />
            </FormGroup>

            <RoleSelect
              margin="normal"
              variant="standard"
              label={t("profile.allowedUserRoles")}
              error={touched.allowed_role_names && !!errors.allowed_role_names}
              helperText={(touched.allowed_role_names && errors.allowed_role_names) as string}
              onChange={(value) => setFieldValue("allowed_role_names", value)}
              value={values.allowed_role_names}
            />

            <TillLayoutSelect
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
