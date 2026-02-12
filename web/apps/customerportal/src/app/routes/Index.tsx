import { useGetCustomerQuery, usePayoutInfoQuery } from "@/api";
import { useCurrencyFormatter } from "@/hooks";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Alert, AlertTitle, Grid, Link, Paper, Stack, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { OrderList } from "./OrderList";

export const Index: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = usePublicConfig();

  const formatCurrency = useCurrencyFormatter();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();
  const { data: payoutInfo, error: payoutInfoError, isLoading: isPayoutInfoLoading } = usePayoutInfoQuery();

  if (isCustomerLoading || (!customer && !customerError) || isPayoutInfoLoading || (!payoutInfo && !payoutInfoError)) {
    return <Loading />;
  }

  if (customerError || !customer || payoutInfoError || !payoutInfo) {
    toast.error(t("errorLoadingCustomer"));
    return null;
  }

  // TODO: depending on the order_type we want to show different stuff
  // we also might want to show the balance of the account after each order

  let payout_info;
  if (payoutInfo.in_payout_run && !payoutInfo.payout_date) {
    payout_info = t("payout.infoPayoutScheduled");
  } else if (payoutInfo.in_payout_run && payoutInfo.payout_date) {
    payout_info = t("payout.infoPayoutCompleted", {
      payout_date: new Date(payoutInfo.payout_date).toLocaleString(),
    });
  } else if (customer.has_entered_info) {
    payout_info = t("payout.infoPayoutInitiated");
  } else {
    payout_info = (
      <Trans i18nKey="payoutInfo">
        to get your payout
        <Link component={RouterLink} to="/payout-info">
          enter bank account details here
        </Link>
      </Trans>
    );
  }

  return (
    <Grid container justifyItems="center" justifyContent="center" spacing={2} sx={{ paddingX: 0.5 }}>
      {config.sumup_topup_enabled && (
        <Grid size={{ xs: 12, sm: 8 }}>
          <Alert severity="info" onClick={() => navigate("/topup")} sx={{ cursor: "pointer" }}>
            <AlertTitle>{t("topup.onlineTopUp")}</AlertTitle>
            {t("topup.description")}
          </Alert>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 8 }} sx={{ mt: 2 }}>
        <Grid container justifyContent="center">
          <Paper
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
                  {t("tagPin")}
                </Typography>
                <Typography component="div" variant="subtitle2">
                  {customer.user_tag_pin}
                </Typography>
                <Typography component="div" variant="body1">
                  {t("tagUid")}
                </Typography>
                <Typography component="div" variant="subtitle2">
                  {formatUserTagUid(customer.user_tag_uid_hex)}
                </Typography>
              </div>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {config.payout_enabled && (
        <Grid size={{ xs: 12, sm: 8 }}>
          <Alert severity="info" variant="outlined" style={{ marginBottom: "1em", width: "100%" }}>
            {payout_info}
          </Alert>
        </Grid>
      )}

      {!config.payout_enabled && (
        <Grid size={{ xs: 12, sm: 8 }}>
          <Alert severity="warning" variant="outlined" style={{ marginBottom: "1em", width: "100%" }}>
            <b>{t("payout.onlyDuringEvent")}</b>
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 8 }}>
        <OrderList />
      </Grid>
    </Grid>
  );
};
