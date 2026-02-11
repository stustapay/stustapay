import * as React from "react";
import { DateTime } from "luxon";
import { Card, CardContent, Grid, Skeleton, Typography, useTheme, useMediaQuery } from "@mui/material";
import { TrendingUp as TrendingUpIcon } from "@mui/icons-material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { PieChart, PieChartData } from "@/components";
import { useGetDashboardOverviewQuery, useGetPaymentMethodStatsQuery, useGetProductStatsQuery, RevenuePrediction } from "@/api";
import { useTranslation } from "react-i18next";

export type DashboardKPIsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  subnodeId?: number;
  productId?: number;
  prediction?: RevenuePrediction;
  isPredictionLoading?: boolean;
  pollingIntervalMs?: number;
};

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  fromTimestamp,
  toTimestamp,
  tillId,
  subnodeId,
  productId,
  prediction,
  isPredictionLoading,
  pollingIntervalMs = 0,
}) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mobileKpiGridSize = isSmallMobile ? 6 : 12;

  const { data: overviewResponse, isLoading: isOverviewLoading } = useGetDashboardOverviewQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
      subnodeId: subnodeId,
    },
    { pollingInterval: pollingIntervalMs }
  );
  const { data: paymentMethods, isLoading: isPaymentMethodsLoading } = useGetPaymentMethodStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
      subnodeId: subnodeId,
    },
    { pollingInterval: pollingIntervalMs }
  );
  const { data: productStats, isLoading: isProductStatsLoading } = useGetProductStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
      subnodeId: subnodeId,
    },
    { pollingInterval: pollingIntervalMs }
  );

  // Get selected product stats if productId is specified
  const selectedProductStats = React.useMemo(() => {
    if (productId === undefined || !productStats) return null;
    const allProducts = [...(productStats.product_overall_stats || []), ...(productStats.deposit_overall_stats || [])];
    return allProducts.find((p) => p.product_id === productId) || null;
  }, [productId, productStats]);

  const overview = overviewResponse;

  if (isOverviewLoading || isPaymentMethodsLoading || isProductStatsLoading) {
    return (
      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
        {[...Array(8)].map((_, i) => (
          <Grid key={i} size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={isSmallMobile ? 120 : isMobile ? 140 : 160} />
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

  const paymentMethodData: PieChartData[] = paymentMethods.methods
    .filter((method) => method.payment_method !== "tag")
    .map((method) => ({
      id: method.payment_method,
      value: method.revenue,
    }));

  // When a product is selected, show product-specific KPIs
  let kpiCards = selectedProductStats
    ? [
        {
          title: t("overview.productRevenue"),
          value: formatCurrency(selectedProductStats.revenue),
          color: "success.main",
        },
        {
          title: t("overview.productQuantitySold"),
          value: selectedProductStats.count.toString(),
          color: "info.main",
        },
      ]
    : [
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
          color: "#AB47BC",
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

  if (currentNode.event == null && !selectedProductStats) {
    // Filter out cards that are not relevant for sub-nodes
    const cardsToRemove = [t("overview.totalGuestCredit"), t("overview.guestsWithCredit"), t("overview.onlineDonation"), t("overview.onlineForPayout"), t("overview.guestsPaidOut")];
    kpiCards = kpiCards.filter((card) => !cardsToRemove.includes(card.title));
  }

  return (
    <Grid container spacing={{ xs: 0.75, sm: 1, md: 1.5 }}>
      {kpiCards.map((card, index) => (
        <Grid key={index} size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 0.75, sm: 1.5, md: 2 } } }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
                  textTransform: "uppercase",
                  letterSpacing: { xs: "0.15px", sm: "0.3px", md: "0.5px" },
                  mb: { xs: 0.35, sm: 0.5 },
                  display: "block",
                  lineHeight: 1.1,
                }}
              >
                {card.title}
              </Typography>
              <Typography
                variant="h4"
                component="div"
                sx={{
                  color: card.color.startsWith("#") ? card.color : "#73BF69",
                  fontWeight: 600,
                  fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      {/* Prediction KPI cards - only show when no product filter */}
      {!selectedProductStats && prediction && !isPredictionLoading && (
        <>
          <Grid size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
            <Card
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
                border: (theme) =>
                  `1px dashed ${theme.palette.mode === "dark" ? "rgba(66, 165, 245, 0.5)" : "rgba(66, 165, 245, 0.7)"}`,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 0.75, sm: 1.5, md: 2 } } }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
                    textTransform: "uppercase",
                    letterSpacing: { xs: "0.15px", sm: "0.3px", md: "0.5px" },
                    mb: { xs: 0.35, sm: 0.5 },
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.1,
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }} />
                  {t("overview.predictedEndOfDay")}
                </Typography>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    color: "#42A5F5",
                    fontWeight: 600,
                    fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatCurrency(prediction.predicted_end_of_day)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* Only show event total prediction at event level */}
          {currentNode.event != null && (
            <Grid size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
              <Card
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: (theme) =>
                    `1px dashed ${theme.palette.mode === "dark" ? "rgba(66, 165, 245, 0.5)" : "rgba(66, 165, 245, 0.7)"}`,
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 0.75, sm: 1.5, md: 2 } } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
                      textTransform: "uppercase",
                      letterSpacing: { xs: "0.15px", sm: "0.3px", md: "0.5px" },
                      mb: { xs: 0.35, sm: 0.5 },
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      lineHeight: 1.1,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }} />
                    {t("overview.predictedEventTotal")}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{
                      color: "#42A5F5",
                      fontWeight: 600,
                      fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatCurrency(prediction.predicted_event_total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {/* Revenue per visitor - only show if we have historical data */}
          {prediction.historical_revenue_per_visitor && (
            <Grid size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
              <Card
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 0.75, sm: 1.5, md: 2 } } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
                      textTransform: "uppercase",
                      letterSpacing: { xs: "0.15px", sm: "0.3px", md: "0.5px" },
                      mb: { xs: 0.35, sm: 0.5 },
                      display: "block",
                      lineHeight: 1.1,
                    }}
                  >
                    {t("overview.revenuePerVisitor")}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{
                      color: "#FF7043",
                      fontWeight: 600,
                      fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatCurrency(prediction.historical_revenue_per_visitor)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {/* Visitor-based prediction - only show if expected visitors is configured */}
          {prediction.visitor_based_prediction && (
            <Grid size={{ xs: mobileKpiGridSize, sm: 6, md: 3 }}>
              <Card
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: (theme) =>
                    `1px dashed ${theme.palette.mode === "dark" ? "rgba(171, 71, 188, 0.5)" : "rgba(171, 71, 188, 0.7)"}`,
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 0.75, sm: 1.5, md: 2 } } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
                      textTransform: "uppercase",
                      letterSpacing: { xs: "0.15px", sm: "0.3px", md: "0.5px" },
                      mb: { xs: 0.35, sm: 0.5 },
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      lineHeight: 1.1,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }} />
                    {t("overview.visitorBasedPrediction")}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{
                      color: "#AB47BC",
                      fontWeight: 600,
                      fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatCurrency(prediction.visitor_based_prediction)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}
      {/* Only show payment methods chart when no product is selected */}
      {!selectedProductStats && (
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
                <PieChart data={paymentMethodData} height={isSmallMobile ? 120 : isMobile ? 140 : 160} useCurrency />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  {t("overview.noDataAvailable")}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};
