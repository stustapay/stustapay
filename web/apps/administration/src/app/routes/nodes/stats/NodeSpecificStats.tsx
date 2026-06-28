import { Alert, AlertTitle, Card, CardContent, Grid, Skeleton } from "@mui/material";
import { ResponsiveLine } from "@nivo/line";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useGetProductStatsQuery, ProductTimeseries, ProductOverallStats } from "@/api";
import {
  CollapsibleStatsPanel,
  DailyStatsTable,
  HourlyGraph,
  NodeSelect,
  ProductStatsSliceTooltip,
} from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";

const caseInsensitiveSort = (v1: unknown, v2: unknown) =>
  String(v1).localeCompare(String(v2), undefined, { sensitivity: "base" });

const IndividualProductStats: React.FC<{
  hourly_intervals: ProductTimeseries[];
  overall_stats: ProductOverallStats[];
  useRevenue: boolean;
}> = ({ hourly_intervals, overall_stats, useRevenue }) => {
  const { t } = useTranslation();

  const columns: GridColDef<ProductOverallStats>[] = React.useMemo(
    () => [
      {
        field: "product_name",
        headerName: t("overview.productTotal"),
        flex: 1,
        minWidth: 100,
        sortComparator: caseInsensitiveSort,
      },
      {
        field: "node_name",
        headerName: t("common.node"),
        width: 100,
        sortComparator: caseInsensitiveSort,
      },
      {
        field: "count",
        headerName: t("overview.quantitySold"),
        type: "number",
        width: 80,
        align: "right",
        headerAlign: "right",
      },
      {
        field: "vouchers_redeemed",
        headerName: t("overview.vouchersRedeemed"),
        type: "number",
        width: 100,
        align: "right",
        headerAlign: "right",
      },
      {
        field: "revenue",
        headerName: t("overview.revenue"),
        type: "currency",
        width: 100,
        align: "right",
        headerAlign: "right",
      },
    ],
    [t]
  );

  const hourlyData = React.useMemo(() => {
    const sortedIntervals = [...hourly_intervals].toSorted((a, b) =>
      a.product_name.localeCompare(b.product_name, undefined, { sensitivity: "base" })
    );
    return sortedIntervals.map((productData) => ({
      id: productData.product_name,
      data: productData.intervals.map((interval) => ({
        x: DateTime.fromISO(interval.to_time).toJSDate(),
        y: useRevenue ? interval.revenue : interval.count,
      })),
    }));
  }, [hourly_intervals, useRevenue]);

  const formatCurrency = useCurrencyFormatter();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 8 }} sx={{ height: 300 }}>
        <ResponsiveLine
          animate={false}
          data={hourlyData}
          colors={{ scheme: "category10" }}
          axisBottom={{
            format: "%a %H:%M",
            legend: "time",
            tickRotation: 0,
            legendPosition: "middle",
            legendOffset: 35,
          }}
          axisLeft={{
            legend: useRevenue ? "revenue per hour" : "count per hour",
            legendPosition: "middle",
            legendOffset: useRevenue ? -80 : -40,
            format: (value) => {
              if (useRevenue) {
                return formatCurrency(value);
              }
              return value;
            },
          }}
          xFormat={(value: Date) => DateTime.fromJSDate(value).toISO() ?? ""}
          yFormat={(value) => (useRevenue ? formatCurrency(Number(value)) : String(value))}
          enableSlices="x"
          enableTouchCrosshair
          sliceTooltip={ProductStatsSliceTooltip}
          theme={{
            tooltip: {
              container: {
                maxWidth: "none",
              },
            },
          }}
          curve="monotoneX"
          margin={{
            bottom: 40,
            left: useRevenue ? 90 : 80,
            right: 180,
            top: 20,
          }}
          useMesh
          xScale={{
            type: "time",
            useUTC: false,
          }}
          yScale={{
            type: "linear",
            min: "auto",
            max: "auto",
          }}
          legends={[
            {
              anchor: "bottom-right",
              direction: "column",
              translateX: 170,
              itemDirection: "left-to-right",
              itemWidth: 160,
              itemHeight: 20,
              symbolSize: 12,
              symbolShape: "circle",
            },
          ]}
        />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <DataGrid
          rows={overall_stats}
          columns={columns}
          getRowId={(row) => row.product_id}
          disableRowSelectionOnClick
          hideFooter
          density="compact"
          initialState={{
            sorting: {
              sortModel: [{ field: "product_name", sort: "asc" }],
            },
          }}
          sx={{ height: 300, border: "none", boxShadow: "none" }}
        />
      </Grid>
    </Grid>
  );
};

export type NodeSpecificStatsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  pollingInterval: number;
};

export const NodeSpecificStats: React.FC<NodeSpecificStatsProps> = ({
  fromTimestamp,
  toTimestamp,
  dailyEndTime,
  groupByDay,
  useRevenue,
  pollingInterval,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [node, setNode] = React.useState(currentNode);
  const { data: productStats, isLoading: isStatsLoading } = useGetProductStatsQuery(
    {
      nodeId: node.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
    },
    { pollingInterval }
  );

  if (isStatsLoading) {
    return (
      <Grid size={{ xs: 12 }}>
        <Skeleton variant="rounded" height={300} />
      </Grid>
    );
  }

  if (!productStats) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("overview.statsLoadError")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <NodeSelect label={t("common.node")} value={node} onChange={(val) => val && setNode(val)} />
          <CollapsibleStatsPanel title={t("overview.totalSalesRevenue")}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 8 }} sx={{ height: 300 }}>
                <HourlyGraph
                  dailyEndTime={dailyEndTime}
                  groupByDay={groupByDay}
                  useRevenue={true}
                  data={productStats}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ height: 300 }}>
                <DailyStatsTable data={productStats} useRevenue={true} />
              </Grid>
            </Grid>
          </CollapsibleStatsPanel>
          <CollapsibleStatsPanel title={t("overview.productSalesStats")}>
            <IndividualProductStats
              hourly_intervals={productStats.product_hourly_intervals}
              overall_stats={productStats.product_overall_stats}
              useRevenue={useRevenue}
            />
          </CollapsibleStatsPanel>
          <CollapsibleStatsPanel title={t("overview.depositProductStats")}>
            <IndividualProductStats
              hourly_intervals={productStats.deposit_hourly_intervals}
              overall_stats={productStats.deposit_overall_stats}
              useRevenue={useRevenue}
            />
          </CollapsibleStatsPanel>
        </CardContent>
      </Card>
    </Grid>
  );
};
