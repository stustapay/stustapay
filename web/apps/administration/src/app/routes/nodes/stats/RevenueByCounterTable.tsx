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
  Stack,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { useGetRevenueByCounterQuery } from "@/api";
import { useTranslation } from "react-i18next";
import { TableFilterBar } from "@/components/tables/TableFilterBar";
import { SortableTableHeader } from "@/components/tables/SortableTableHeader";
import { useFilterableTable } from "@/hooks/useFilterableTable";

export type RevenueByCounterTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  subnodeId?: number;
  pollingIntervalMs?: number;
};

export const RevenueByCounterTable: React.FC<RevenueByCounterTableProps> = ({
  fromTimestamp,
  toTimestamp,
  tillId,
  subnodeId,
  pollingIntervalMs = 0,
}) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useGetRevenueByCounterQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
      subnodeId: subnodeId,
    },
    { pollingInterval: pollingIntervalMs }
  );

  const dateStr = fromTimestamp?.toISODate() ?? toTimestamp?.toISODate() ?? "Total";

  // Use filterable table hook
  const {
    filteredData,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSort,
  } = useFilterableTable({
    data: data?.counters || [],
    searchFields: ["till_name"],
    defaultSort: { field: "revenue", direction: "desc" },
  });

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
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.3px", sm: "0.5px" },
              mb: { xs: 1.5, sm: 2 },
              color: "text.secondary",
            }}
          >
            {t("overview.revenuePerCounter")}
          </Typography>
          <Skeleton variant="rounded" height={isMobile ? 150 : 200} />
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
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.3px", sm: "0.5px" },
              mb: { xs: 1.5, sm: 2 },
              color: "text.secondary",
            }}
          >
            {t("overview.revenuePerCounter")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noDataAvailable")}
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
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.3px", sm: "0.5px" },
              mb: { xs: 1.5, sm: 2 },
              color: "text.secondary",
            }}
          >
            {t("overview.revenuePerCounter")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noDataAvailable")}
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
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
        <Stack spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.2px", sm: "0.3px", md: "0.5px" },
              color: "text.secondary",
            }}
          >
            {t("overview.revenuePerCounter")}
          </Typography>

          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("overview.searchCounters")}
          />

          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#73BF69",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#5a9a4f",
                },
              },
            }}
          >
            <TableContainer>
              <Table
                size="small"
                sx={{
                  minWidth: 400,
                  "& .MuiTableCell-root": {
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
                    py: { xs: 0.5, sm: 0.75, md: 1 },
                    px: { xs: 0.75, sm: 1, md: 1.5 },
                  },
                  "& .MuiTableRow-root": {
                    transition: "background-color 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  },
                }}
              >
              <TableHead>
                <TableRow>
                  <SortableTableHeader
                    field="till_name"
                    label={`${t("entry.area")} / ${t("overview.date")}`}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                  <SortableTableHeader
                    field="revenue"
                    label={dateStr}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                    align="right"
                  />
                  <SortableTableHeader
                    field="revenue"
                    label={t("overview.total")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                    align="right"
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{
                        py: { xs: 2, sm: 3 },
                        color: "text.secondary",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      {t("overview.noCountersMatchFilter")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((counter) => (
                    <TableRow key={counter.till_id}>
                      <TableCell component="th" scope="row">
                        {counter.till_name}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: "#73BF69",
                          fontWeight: 500,
                          transition: "color 0.2s ease-in-out",
                        }}
                      >
                        {formatCurrency(counter.revenue)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: "#73BF69",
                          fontWeight: 500,
                          transition: "color 0.2s ease-in-out",
                        }}
                      >
                        {formatCurrency(counter.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
