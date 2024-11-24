import { useCreatePayoutRunMutation } from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";
import { ChevronLeft } from "@mui/icons-material";
import { Button, Grid, IconButton, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { FormCurrencyInput, FormNumericInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { PendingPayoutDetail } from "./PendingPayoutDetail";

const NewPayoutRunSchema = z.object({
  max_payout_sum: z.number().gt(0),
  max_num_payouts: z.number().gt(0),
});

type NewPayoutRun = z.infer<typeof NewPayoutRunSchema>;

export const PayoutRunCreate: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { eventSettings } = useCurrentEventSettings();

  const [createPayoutRun] = useCreatePayoutRunMutation();

  const handleSubmit = (values: NewPayoutRun, { setSubmitting }: FormikHelpers<NewPayoutRun>) => {
    setSubmitting(true);

    createPayoutRun({ nodeId: currentNode.id, newPayoutRun: values })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(PayoutRunRoutes.list());
      })
      .catch((err) => {
        setSubmitting(false);
      });
  };

  const [initialValues, refinedSchema] = React.useMemo(() => {
    const initialValues = {
      max_payout_sum: 0,
      max_num_payouts: eventSettings.sepa_max_num_payouts_in_run,
    };
    const refinedForm = NewPayoutRunSchema.refine(
      ({ max_num_payouts }) => max_num_payouts <= eventSettings.sepa_max_num_payouts_in_run,
      {
        message: t("payoutRun.maxNumPayoutsMustBeSmallerThanEventDefault", {
          maxNumPayoutsAtEvent: eventSettings.sepa_max_num_payouts_in_run,
        }),
        path: ["max_num_payouts"],
      }
    );

    return [initialValues, refinedForm];
  }, [eventSettings, t]);

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
        validationSchema={toFormikValidationSchema(refinedSchema)}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <PendingPayoutDetail />
              <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <FormCurrencyInput
                    variant="outlined"
                    name="max_payout_sum"
                    label={t("payoutRun.maxPayoutSum")}
                    formik={formik}
                  />
                  <FormNumericInput
                    variant="outlined"
                    name="max_num_payouts"
                    label={t("payoutRun.maxNumPayouts")}
                    formik={formik}
                  />

                  {formik.isSubmitting && <LinearProgress />}
                  <Button type="submit" fullWidth variant="contained" color="primary" disabled={formik.isSubmitting}>
                    {t("submit")}
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};
