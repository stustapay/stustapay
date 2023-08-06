import { ChevronLeft } from "@mui/icons-material";
import { Button, Grid, IconButton, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

export interface ChangeLayoutProps<T extends Record<string, any>> {
  title: string;
  submitLabel?: string;
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
  initialValues,
  validationSchema,
  onSubmit,
  form: ChildForm,
}: ChangeLayoutProps<T>) {
  const navigate = useNavigate();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(successRoute);
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in change", err);
      });
  };

  return (
    <Stack spacing={2}>
      <Grid container spacing={1}>
        <Grid item display="flex" alignItems="center">
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
                <ChildForm {...props} />
                {props.isSubmitting && <LinearProgress />}
              </Paper>
              <Button type="submit" fullWidth variant="contained" color="primary" disabled={props.isSubmitting}>
                {submitLabel}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
}
