import { Link as RouterLink } from "react-router-dom";
import { useGetCustomerQuery } from "@/api/customerApi";
import { Link, Alert, Grid, Paper, Stack, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { toast } from "react-toastify";
import { useTranslation, Trans } from "react-i18next";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { OrderList } from "./OrderList";
import { formatUserTagUid } from "@stustapay/models";

export const Index: React.FC = () => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    toast.error(t("errorLoadingCustomer"));
    // navigate(-1); // this will cause infinite redirect loops if the backend is not running
    return null;
  }

  // TODO: depending on the order_type we want to show different stuff
  // we also might want to show the balance of the account after each order

  return (
    <Grid container justifyItems="center" justifyContent="center" spacing={2} sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Grid container justifyContent="center">
          <Paper
            // variant="outlined"
            sx={{
              paddingX: 8,
              paddingY: 3,
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Stack spacing={1}>
              <Typography component="div" variant="h4">
                {formatCurrency(customer.balance)}
              </Typography>

              {customer.vouchers > 0 && (
                <div>
                  <Typography component="div" variant="body1">
                    {t("vouchers")}
                  </Typography>
                  <Typography component="div" variant="subtitle2">
                    {customer.vouchers}
                  </Typography>
                </div>
              )}

              <div>
                <Typography component="div" variant="body1">
                  {t("tagUid")}
                </Typography>
                <Typography component="div" variant="subtitle2">
                  {formatUserTagUid(customer.user_tag_uid)}
                </Typography>
              </div>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid item xs={12} sm={8}>
        <Alert severity="info" variant="outlined" style={{ marginBottom: "1em", width: "100%" }}>
          <Trans i18nKey="payoutInfo">
            to get your payout
            <Link component={RouterLink} to="/payout-info">
              enter bank account details here
            </Link>
          </Trans>
        </Alert>
      </Grid>

      <Grid item xs={12} sm={8}>
        <OrderList />
      </Grid>
    </Grid>
  );
};
