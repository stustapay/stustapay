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

  if (
    isCustomerLoading ||
    (!customer && !customerError) ||
    isPayoutInfoLoading ||
    (!payoutInfo && !payoutInfoError)
  ) {
    return <Loading />;
  }

  if (customerError || !customer || payoutInfoError || !payoutInfo) {
    React.useEffect(() => {
      toast.error(t("errorLoadingCustomer"));
    }, []);
    return null;
  }

  // TODO: depending on the order_type we want to show different stuff
  // we also might want to show the balance of the account after each order

  let payout_info;
  if (payoutInfo.in_payout_run && !payoutInfo.payout_date) {
    payout_info = t("payout.infoPayoutScheduled");
  } else if (payoutInfo.in_payout_run && payoutInfo.payout_date) {
    payout_info = t("payout.infoPayoutCompleted", { payout_date: new Date(payoutInfo.payout_date).toLocaleString() });
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
    <Grid container justifyItems="center" justifyContent="center" spacing={2}>
      {config.sumup_topup_enabled && (
        <Grid item xs={12} sm={8}>
          <Alert severity="info" onClick={() => navigate("/topup")} className="glass-alert" sx={{ cursor: "pointer" }}>
            <AlertTitle>{t("topup.onlineTopUp")}</AlertTitle>
            {t("topup.description")}
          </Alert>
        </Grid>
      )}
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Grid container justifyContent="center">
          <Paper
            elevation={8}
            sx={{
              paddingX: { xs: 3, sm: 5, md: 8 },
              paddingY: { xs: 3, sm: 4 },
              justifyContent: "center",
              textAlign: "center",
              width: "100%",
              background: "var(--primary-gradient, linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%))",
              color: "white",
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: "-50%",
                right: "-50%",
                width: "100%",
                height: "100%",
                background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                pointerEvents: "none",
              },
            }}
          >
            <Stack spacing={2}>
              <Typography component="div" variant="h3" fontWeight="bold" sx={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                {formatCurrency(customer.balance)}
              </Typography>

              {customer.has_entered_info && (
                <div>
                  <Typography component="div" variant="body1" sx={{ opacity: 0.85 }}>
                    {t("payout.payoutAmount")}
                  </Typography>
                  <Typography component="div" variant="h5" fontWeight="bold" sx={{ color: "#90caf9" }}>
                    {formatCurrency(customer.balance - (customer.donation || 0))}
                  </Typography>
                </div>
              )}

              {customer.vouchers > 0 && (
                <div>
                  <Typography component="div" variant="body1" sx={{ opacity: 0.85 }}>
                    {t("vouchers")}
                  </Typography>
                  <Typography component="div" variant="h6" fontWeight="medium">
                    {customer.vouchers}
                  </Typography>
                </div>
              )}

              <div>
                <Typography component="div" variant="body2" sx={{ opacity: 0.75, mt: 1 }}>
                  {t("tagPin")}
                </Typography>
                <Typography component="div" variant="body1" fontWeight="medium">
                  {customer.user_tag_pin}
                </Typography>
                <Typography component="div" variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
                  {t("tagUid")}
                </Typography>
                <Typography component="div" variant="body1" fontWeight="medium">
                  {formatUserTagUid(customer.user_tag_uid_hex)}
                </Typography>
              </div>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {config.payout_enabled && (
        <Grid item xs={12} sm={8}>
          <Alert severity="info" variant="outlined" className="glass-alert" style={{ marginBottom: "1em", width: "100%" }}>
            {payout_info}
          </Alert>
        </Grid>
      )}

      {!config.payout_enabled && (
        <Grid item xs={12} sm={8}>
          <Alert severity="warning" variant="outlined" className="glass-alert" style={{ marginBottom: "1em", width: "100%" }}>
            <b>{t("payout.onlyDuringEvent")}</b>
          </Alert>
        </Grid>
      )}

      <Grid item xs={12} sm={8}>
        <OrderList />
      </Grid>
    </Grid>
  );
};
