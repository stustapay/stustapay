import { Alert, Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useGetPaymentMethodStatsQuery } from "@/api";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";

export interface PaymentMethodStatsCardProps {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  useRevenue: boolean;
  pollingInterval?: number;
}

export const PaymentMethodStatsCard: React.FC<PaymentMethodStatsCardProps> = ({
  fromTimestamp,
  toTimestamp,
  useRevenue,
  pollingInterval = 0,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { data, error } = useGetPaymentMethodStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
    },
    { pollingInterval }
  );

  const chartData = React.useMemo(() => {
    if (!data) {
      return [];
    }
    return data.stats.map((entry) => ({
      id: t(`overview.paymentMethods.${entry.payment_method}`, entry.payment_method),
      label: t(`overview.paymentMethods.${entry.payment_method}`, entry.payment_method),
      value: useRevenue ? entry.revenue : entry.count,
    }));
  }, [data, t, useRevenue]);

  if (!data) {
    return <Skeleton variant="rounded" height={200} />;
  }

  if (error) {
    return <Alert severity="error">{t("overview.statsLoadError")}</Alert>;
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography gutterBottom variant="h6" component="div">
          {t("overview.paymentMethodDistribution")}
        </Typography>
        {chartData.length === 0 ? (
          <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography color="text.secondary">{t("overview.noPaymentData")}</Typography>
          </Box>
        ) : (
          <Box sx={{ height: 200 }}>
            <ResponsivePie
              data={chartData}
              margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
              innerRadius={0.5}
              padAngle={1}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: "category10" }}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              enableArcLinkLabels={false}
              arcLabel={(datum) =>
                useRevenue ? formatCurrency(Number(datum.value)) : String(Math.round(Number(datum.value)))
              }
              legends={[
                {
                  anchor: "right",
                  direction: "column",
                  translateX: 100,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 12,
                  symbolShape: "circle",
                },
              ]}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
