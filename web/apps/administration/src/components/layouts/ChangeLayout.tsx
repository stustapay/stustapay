import { ChevronLeft } from "@mui/icons-material";
import { Button, Grid, IconButton, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/react/index";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

export interface ChangeLayoutProps<T extends Record<string, any>> {
  title: string;
  submitLabel: string;
  saveAndClearLabel?: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  successRoute: string;
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
  form: React.FC<FormikProps<T>>;
}

export function ChangeLayout<T extends Record<string, any>>({
  title,
  successRoute,
  submitLabel,
  saveAndClearLabel,
  initialValues,
  validationSchema,
  onSubmit,
  form: ChildForm,
}: ChangeLayoutProps<T>) {
  const initial = React.useMemo(() => {
    return { ...initialValues, isAddAnother: false };
  }, [initialValues]);
  const navigate = useNavigate();
  const handleSubmit = (values: T, { setSubmitting, resetForm }: FormikHelpers<T>) => {
    setSubmitting(true);

    const isAddAnother = values.isAddAnother;

    const submittingValues = { ...values };
    delete submittingValues["isAddAnother"];

    onSubmit(submittingValues)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        if (isAddAnother) {
          resetForm();
        } else {
          navigate(successRoute);
        }
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in change", err);
      });
  };

  return (
    <Stack spacing={2}>
      <Grid container spacing={1}>
        <Grid display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ChevronLeft />
          </IconButton>
          <Typography component="div" variant="h5">
            {title}
          </Typography>
        </Grid>
      </Grid>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(validationSchema)}
      >
        {(props) => (
          <Form onSubmit={props.handleSubmit}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <ChildForm {...props} />
                </Stack>
                {props.isSubmitting && <LinearProgress />}
              </Paper>
              <Stack direction="row" spacing={1}>
                <Button type="submit" fullWidth variant="contained" color="primary" disabled={props.isSubmitting}>
                  {submitLabel}
                </Button>
                {saveAndClearLabel && (
                  <Button
                    type="submit"
                    onClick={() => {
                      props.setFieldValue("isAddAnother", true);
                      props.handleSubmit();
                    }}
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={props.isSubmitting}
                  >
                    {saveAndClearLabel}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
}
