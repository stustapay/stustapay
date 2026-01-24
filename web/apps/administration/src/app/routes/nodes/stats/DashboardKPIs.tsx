import * as React from "react";
import { DateTime } from "luxon";
import { Card, CardContent, Grid, Skeleton, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { PieChart, PieChartData } from "@/components";
import { useGetDashboardOverviewQuery, useGetPaymentMethodStatsQuery } from "@/api";
import { useTranslation } from "react-i18next";

export type DashboardKPIsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
};

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ fromTimestamp, toTimestamp, tillId }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: overviewResponse, isLoading: isOverviewLoading } = useGetDashboardOverviewQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
    },
    { skip: currentNode.event == null }
  );
  const { data: paymentMethods, isLoading: isPaymentMethodsLoading } = useGetPaymentMethodStatsQuery({
    nodeId: currentNode.id,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    tillId: tillId,
  });

  let overview = overviewResponse;
  if (currentNode.event == null && paymentMethods) {
    // For sub-nodes, we derive available stats from payment methods since dashboard overview is not available
    overview = {
      total_revenue: paymentMethods.total_revenue,
      guests_with_orders: paymentMethods.methods.reduce((sum, m) => sum + m.order_count, 0),
      total_guest_credit: 0,
      guests_with_credit: 0,
      guests_paid_out: 0,
      online_donation: 0,
      online_for_payout: 0,
    };
  }

  if (isOverviewLoading || isPaymentMethodsLoading) {
    return (
      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
        {[...Array(8)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={isSmallMobile ? 90 : isMobile ? 100 : 120} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!overview || !paymentMethods) {
    return (
      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
        <Grid size={12}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                {t("overview.noDataAvailable")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  const paymentMethodData: PieChartData[] = paymentMethods.methods.map((method) => ({
    id: method.payment_method,
    value: method.revenue,
  }));

  let kpiCards = [
    {
      title: t("overview.totalGuestCredit"),
      value: formatCurrency(overview.total_guest_credit),
      color: "success.main",
    },
    {
      title: t("overview.totalRevenue"),
      value: formatCurrency(overview.total_revenue),
      color: "success.main",
    },
    {
      title: t("overview.guestsWithOrders"),
      value: overview.guests_with_orders.toString(),
      color: "info.main",
    },
    {
      title: t("overview.guestsWithCredit"),
      value: overview.guests_with_credit.toString(),
      color: "info.main",
    },
    {
      title: t("overview.guestsPaidOut"),
      value: overview.guests_paid_out.toString(),
      color: "info.main",
    },
    {
      title: t("overview.onlineDonation"),
      value: formatCurrency(overview.online_donation),
      color: "warning.main",
    },
    {
      title: t("overview.onlineForPayout"),
      value: formatCurrency(overview.online_for_payout),
      color: "warning.main",
    },
  ];

  if (currentNode.event == null) {
    // Filter out cards that are not relevant for sub-nodes
    const cardsToRemove = [t("overview.totalGuestCredit"), t("overview.guestsWithCredit"), t("overview.onlineDonation"), t("overview.onlineForPayout"), t("overview.guestsPaidOut")];
    kpiCards = kpiCards.filter((card) => !cardsToRemove.includes(card.title));
  }

  return (
    <Grid container spacing={{ xs: 0.75, sm: 1, md: 1.5 }}>
      {kpiCards.map((card, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.75rem" },
                  textTransform: "uppercase",
                  letterSpacing: { xs: "0.2px", sm: "0.3px", md: "0.5px" },
                  mb: { xs: 0.5, sm: 0.5 },
                  display: "block",
                }}
              >
                {card.title}
              </Typography>
              <Typography
                variant="h4"
                component="div"
                sx={{
                  color: "#73BF69",
                  fontWeight: 600,
                  fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                  lineHeight: 1.2,
                }}
              >
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
            border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                textTransform: "uppercase",
                letterSpacing: { xs: "0.3px", sm: "0.5px" },
                mb: { xs: 0.75, sm: 1 },
                display: "block",
              }}
            >
              {t("overview.paymentMethods")}
            </Typography>
            {paymentMethodData.length > 0 ? (
              <PieChart data={paymentMethodData} height={isSmallMobile ? 90 : isMobile ? 100 : 120} useCurrency />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                {t("overview.noDataAvailable")}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
