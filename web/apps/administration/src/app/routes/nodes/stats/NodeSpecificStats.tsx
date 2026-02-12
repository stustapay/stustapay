import * as React from "react";
import { DateTime } from "luxon";
import {
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { DailyStatsTable, HourlyGraph, NodeSelect } from "@/components";
import { useGetProductStatsQuery, ProductTimeseries, ProductOverallStats } from "@/api";
import { ResponsiveLine } from "@nivo/line";

const IndividualProductStats: React.FC<{
  nodeId: number;
  hourly_intervals: ProductTimeseries[];
  overall_stats: ProductOverallStats[];
  useRevenue: boolean;
}> = ({ hourly_intervals, overall_stats, nodeId, useRevenue }) => {
  const hourlyData = React.useMemo(() => {
    return hourly_intervals.map((productData) => ({
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
      <Grid size={{ xs: 9 }} height={300}>
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
              } else {
                return value;
              }
            },
          }}
          xFormat={(value: Date) => DateTime.fromJSDate(value).toISO() ?? ""}
          enableSlices="x"
          enableTouchCrosshair
          curve="monotoneX"
          margin={{
            bottom: 40,
            left: useRevenue ? 90 : 80,
            right: 150,
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
              translateX: 90,
              itemDirection: "left-to-right",
              itemWidth: 80,
              itemHeight: 20,
              symbolSize: 12,
              symbolShape: "circle",
            },
          ]}
        />
      </Grid>
      <Grid size={{ xs: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product (total)</TableCell>
                <TableCell align="right">{useRevenue ? "Revenue" : "Count"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overall_stats.map((row) => (
                <TableRow key={row.product_id}>
                  <TableCell component="th" scope="row">
                    {row.product_name}
                  </TableCell>
                  <TableCell align="right">{useRevenue ? formatCurrency(row.revenue) : row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
};

export const NodeSpecificStats: React.FC<NodeSpecificStatsProps> = ({
  fromTimestamp,
  toTimestamp,
  dailyEndTime,
  groupByDay,
  useRevenue,
}) => {
  const { currentNode } = useCurrentNode();
  const [node, setNode] = React.useState(currentNode);
  const { data: productStats, isLoading: isStatsLoading } = useGetProductStatsQuery({
    nodeId: node.id,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
  });

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
        <AlertTitle>Error loading stats</AlertTitle>
      </Alert>
    );
  }

  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <NodeSelect label="Node" value={node} onChange={(val) => val && setNode(val)} />
          <Typography variant="h5" sx={{ mt: 2 }}>
            Total revenue through sales
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 9 }} height={300}>
              <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} useRevenue={true} data={productStats} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }} height={300}>
              <DailyStatsTable data={productStats} useRevenue={true} />
            </Grid>
          </Grid>
          <IndividualProductStats
            nodeId={node.id}
            hourly_intervals={productStats.product_hourly_intervals}
            overall_stats={productStats.product_overall_stats}
            useRevenue={useRevenue}
          />
          <Typography variant="h5" sx={{ mt: 2 }}>
            Stats for deposit products
          </Typography>
          <IndividualProductStats
            nodeId={node.id}
            hourly_intervals={productStats.deposit_hourly_intervals}
            overall_stats={productStats.deposit_overall_stats}
            useRevenue={useRevenue}
          />
        </CardContent>
      </Card>
    </Grid>
  );
};
