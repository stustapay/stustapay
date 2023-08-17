import { useCreatePayoutRunMutation, usePendingPayoutDetailQuery } from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { useCurrencyFormatter, useCurrencySymbol } from "@hooks";
import { ChevronLeft } from "@mui/icons-material";
import {
  Button,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Loading, NumericInput } from "@stustapay/components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import { DateTime } from "luxon";
import * as React from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const NewPayoutRunSchema = z.object({
  max_payout_sum: z.number(),
});

type NewPayoutRun = z.infer<typeof NewPayoutRunSchema> & { execution_date: DateTime };

const initialValues: NewPayoutRun = {
  execution_date: DateTime.now(),
  max_payout_sum: 0,
};

export const PayoutRunCreate: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const currencySymbol = useCurrencySymbol();

  const [createPayoutRun] = useCreatePayoutRunMutation();

  const { data: pendingPayoutDetail } = usePendingPayoutDetailQuery();

  const handleSubmit = (values: NewPayoutRun, { setSubmitting }: FormikHelpers<NewPayoutRun>) => {
    setSubmitting(true);

    const isoDate = values.execution_date.toISODate();
    if (isoDate == null) {
      // TODO: proper validation
      return;
    }

    createPayoutRun({ newPayoutRun: { execution_date: isoDate, max_payout_sum: values.max_payout_sum } })
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
        {({ handleSubmit, isSubmitting, touched, values, errors, setFieldValue }) => (
          <Form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">{t("payoutRun.pendingPayoutDetails")}</Typography>
                <List>
                  {pendingPayoutDetail ? (
                    <ListItem>
                      <ListItemText
                        primary={t("payoutRun.totalDonationAmount")}
                        secondary={formatCurrency(pendingPayoutDetail.total_donation_amount)}
                      />
                      <ListItemText
                        primary={t("payoutRun.totalPayoutAmount")}
                        secondary={formatCurrency(pendingPayoutDetail.total_payout_amount)}
                      />
                      <ListItemText primary={t("payoutRun.nPayouts")} secondary={pendingPayoutDetail.n_payouts} />
                    </ListItem>
                  ) : (
                    <Loading />
                  )}
                </List>
              </Paper>
              <Paper sx={{ p: 3 }}>
                <DatePicker
                  label={t("payoutRun.executionDate")}
                  value={values.execution_date}
                  sx={{ width: "100%" }}
                  onChange={(value) => setFieldValue("execution_date", value)}
                />

                <NumericInput
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  name="max_payout_sum"
                  label={t("payoutRun.maxPayoutSum")}
                  InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
                  error={touched.max_payout_sum && !!errors.max_payout_sum}
                  helperText={(touched.max_payout_sum && errors.max_payout_sum) as string}
                  onChange={(value) => setFieldValue("max_payout_sum", value)}
                  value={values.max_payout_sum}
                />

                {isSubmitting && <LinearProgress />}
              </Paper>
              <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting}>
                {t("submit")}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};
