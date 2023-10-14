import { useCreatePayoutRunMutation } from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { useCurrencySymbol, useCurrentNode } from "@/hooks";
import { ChevronLeft } from "@mui/icons-material";
import { Button, Grid, IconButton, InputAdornment, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { FormNumericInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { PendingPayoutDetail } from "./PendingPayoutDetail";

const NewPayoutRunSchema = z.object({
  max_payout_sum: z.number().gt(0),
});

type NewPayoutRun = z.infer<typeof NewPayoutRunSchema>;

const initialValues: NewPayoutRun = {
  max_payout_sum: 0,
};

export const PayoutRunCreate: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const currencySymbol = useCurrencySymbol();

  const [createPayoutRun] = useCreatePayoutRunMutation();

  const handleSubmit = (values: NewPayoutRun, { setSubmitting }: FormikHelpers<NewPayoutRun>) => {
    setSubmitting(true);

    createPayoutRun({ nodeId: currentNode.id, newPayoutRun: { max_payout_sum: values.max_payout_sum } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(PayoutRunRoutes.list());
      })
      .catch((err) => {
        setSubmitting(false);
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
            {t("payoutRun.create")}
          </Typography>
        </Grid>
      </Grid>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(NewPayoutRunSchema)}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <PendingPayoutDetail />
              <Paper sx={{ p: 3 }}>
                <FormNumericInput
                  variant="outlined"
                  name="max_payout_sum"
                  label={t("payoutRun.maxPayoutSum")}
                  InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
                  formik={formik}
                />

                {formik.isSubmitting && <LinearProgress />}
              </Paper>
              <Button type="submit" fullWidth variant="contained" color="primary" disabled={formik.isSubmitting}>
                {t("submit")}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};
