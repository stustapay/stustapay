import * as React from "react";
import { DateTime } from "luxon";
import { Card, CardContent, Grid, Skeleton, Typography } from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { PieChart, PieChartData } from "@/components";

// Temporary types - will be replaced when OpenAPI is regenerated
type DashboardOverview = {
  total_guest_credit: number;
  total_revenue: number;
  guests_with_orders: number;
  guests_with_credit: number;
  guests_paid_out: number;
  online_donation: number;
  online_for_payout: number;
};

type PaymentMethodBreakdown = {
  methods: Array<{ payment_method: string; revenue: number; order_count: number }>;
  total_revenue: number;
};

export type DashboardKPIsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
};

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ fromTimestamp, toTimestamp }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();

  // TODO: Replace with actual hooks after OpenAPI regeneration
  // const { data: overview, isLoading: isOverviewLoading } = useGetDashboardOverviewQuery({
  //   nodeId: currentNode.id,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  // });
  // const { data: paymentMethods, isLoading: isPaymentMethodsLoading } = useGetPaymentMethodStatsQuery({
  //   nodeId: currentNode.id,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  // });

  const overview: DashboardOverview | undefined = undefined as DashboardOverview | undefined; // Placeholder
  const paymentMethods: PaymentMethodBreakdown | undefined = undefined as PaymentMethodBreakdown | undefined; // Placeholder
  const isOverviewLoading = false;
  const isPaymentMethodsLoading = false;

  if (isOverviewLoading || isPaymentMethodsLoading) {
    return (
      <Grid container spacing={2}>
        {[...Array(8)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!overview || !paymentMethods) {
    return (
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Dashboard data will be available after OpenAPI spec regeneration. Please run `make generate-openapi`.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  // Type assertions after null check
  const overviewData = overview as DashboardOverview;
  const paymentMethodsData = paymentMethods as PaymentMethodBreakdown;

  const paymentMethodData: PieChartData[] = paymentMethodsData.methods.map((method: { payment_method: string; revenue: number; order_count: number }) => ({
    id: method.payment_method,
    value: method.revenue,
  }));

  const kpiCards = [
    {
      title: "Guthaben Gäste gesamt",
      value: formatCurrency(overviewData.total_guest_credit),
      color: "success.main",
    },
    {
      title: "Umsatz gesamt",
      value: formatCurrency(overviewData.total_revenue),
      color: "success.main",
    },
    {
      title: "Anzahl Gäste mit Bestellungen",
      value: overviewData.guests_with_orders.toString(),
      color: "info.main",
    },
    {
      title: "Gäste mit Guthaben",
      value: overviewData.guests_with_credit.toString(),
      color: "info.main",
    },
    {
      title: "Ausgezahlte Gäste",
      value: overviewData.guests_paid_out.toString(),
      color: "info.main",
    },
    {
      title: "Online Spende",
      value: formatCurrency(overviewData.online_donation),
      color: "warning.main",
    },
    {
      title: "Online zur Auszahlung",
      value: formatCurrency(overviewData.online_for_payout),
      color: "warning.main",
    },
  ];

  return (
    <Grid container spacing={1.5}>
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
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  mb: 0.5,
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
                  fontSize: "1.75rem",
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
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                mb: 1,
                display: "block",
              }}
            >
              Zahlungsarten
            </Typography>
            {paymentMethodData.length > 0 ? (
              <PieChart data={paymentMethodData} height={120} useCurrency />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                No data
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
