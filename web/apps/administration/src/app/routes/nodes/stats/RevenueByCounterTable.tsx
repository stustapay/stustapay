import * as React from "react";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
} from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";

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

export type RevenueByCounterTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
};

export const RevenueByCounterTable: React.FC<RevenueByCounterTableProps> = ({ fromTimestamp, toTimestamp }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();

  // TODO: Replace with actual hooks after OpenAPI regeneration
  // const { data, isLoading } = useGetRevenueByCounterQuery({
  //   nodeId: currentNode.id,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  // });

  const data: RevenueByCounter | undefined = undefined as RevenueByCounter | undefined; // Placeholder
  const isLoading = false;

  const dateStr = fromTimestamp?.toISODate() ?? toTimestamp?.toISODate() ?? "Total";

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
          <Skeleton variant="rounded" height={200} />
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
        <TableContainer>
          <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "rgba(255, 255, 255, 0.1)" } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  Bereich\datum
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  {dateStr}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.counters.map((counter: CounterRevenue) => (
                <TableRow key={counter.till_id} sx={{ "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" } }}>
                  <TableCell component="th" scope="row" sx={{ fontSize: "0.875rem", py: 1 }}>
                    {counter.till_name}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.875rem", color: "#73BF69", fontWeight: 500, py: 1 }}>
                    {formatCurrency(counter.revenue)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.875rem", color: "#73BF69", fontWeight: 500, py: 1 }}>
                    {formatCurrency(counter.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
