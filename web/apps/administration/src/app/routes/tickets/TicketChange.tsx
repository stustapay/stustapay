import { Button, InputAdornment, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { NewTicket } from "@api";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { NumericInput } from "@stustapay/components";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { ProductSelect, RestrictionSelect } from "@components";
import { useCurrencySymbol } from "@hooks";

export interface TicketChangeProps<T extends NewTicket> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (p: T) => MutationActionCreatorResult<any>;
}

export function TicketChange<T extends NewTicket>({
  headerTitle,
  initialValues,
  submitLabel,
  validationSchema,
  onSubmit,
}: TicketChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/tickets");
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
              label={t("ticket.name")}
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
              label={t("ticket.description")}
              error={touched.description && !!errors.description}
              helperText={(touched.description && errors.description) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.description}
            />

            <NumericInput
              variant="standard"
              margin="normal"
              fullWidth
              name="price"
              label={t("ticket.initialTopUpAmount")}
              InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
              error={touched.initial_top_up_amount && !!errors.initial_top_up_amount}
              helperText={(touched.initial_top_up_amount && errors.initial_top_up_amount) as string}
              onChange={(value) => setFieldValue("initial_top_up_amount", value)}
              value={values.initial_top_up_amount}
            />

            <ProductSelect
              label={t("ticket.product")}
              margin="normal"
              variant="standard"
              value={values.product_id}
              onChange={(value) => setFieldValue("product_id", value)}
              error={touched.product_id && !!errors.product_id}
              helperText={(touched.product_id && errors.product_id) as string}
            />

            <RestrictionSelect
              label={t("ticket.restriction")}
              margin="normal"
              variant="standard"
              value={(values.restriction == null ? null : [values.restriction]) as any} // TODO: proper typing
              multiple={false}
              onChange={(value) => setFieldValue("restriction", value.length > 0 ? value[0] : null)}
              error={touched.restriction && !!errors.restriction}
              helperText={(touched.restriction && errors.restriction) as string}
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
