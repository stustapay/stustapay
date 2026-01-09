import * as React from "react";
import { DateTime } from "luxon";
import { Card, CardContent, Typography, Skeleton } from "@mui/material";
import { BarChart, BarChartData } from "@/components";
import { useCurrentNode } from "@/hooks";

// Temporary types - will be replaced when OpenAPI is regenerated
type CounterRevenue = {
  till_id: number;
  till_name: string;
  revenue: number;
  order_count: number;
};

type RevenueByCounter = {
  counters: CounterRevenue[];
  total_revenue: number;
};

export type RevenueByCounterChartProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
};

export const RevenueByCounterChart: React.FC<RevenueByCounterChartProps> = ({ fromTimestamp, toTimestamp }) => {
  const { currentNode } = useCurrentNode();

  // TODO: Replace with actual hooks after OpenAPI regeneration
  // const { data, isLoading } = useGetRevenueByCounterQuery({
  //   nodeId: currentNode.id,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  // });

  const data: RevenueByCounter | undefined = undefined as RevenueByCounter | undefined; // Placeholder
  const isLoading = false;

  if (isLoading) {
    return (
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
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Umsatz pro Theke
          </Typography>
          <Skeleton variant="rounded" height={250} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
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
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Umsatz pro Theke
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Data will be available after OpenAPI spec regeneration. Please run `make generate-openapi`.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (data && data.counters.length === 0) {
    return (
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
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Umsatz pro Theke
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            No data available for the selected time range
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData: BarChartData[] = data.counters.map((counter: CounterRevenue) => ({
    id: counter.till_name,
    value: counter.revenue,
  }));

  return (
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
          variant="h6"
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            mb: 2,
            color: "text.secondary",
          }}
        >
          Umsatz pro Theke
        </Typography>
        <BarChart data={chartData} height={250} useCurrency horizontal />
      </CardContent>
    </Card>
  );
};
