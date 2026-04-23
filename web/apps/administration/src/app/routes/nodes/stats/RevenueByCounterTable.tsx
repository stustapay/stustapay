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
import { useCurrencyFormatter } from "@/hooks";
import { GetRevenueByCounterApiResponse } from "@/api";
import { useTranslation } from "react-i18next";
import { TableFilterBar } from "@/components/tables/TableFilterBar";
import { SortableTableHeader } from "@/components/tables/SortableTableHeader";
import { useFilterableTable } from "@/hooks/useFilterableTable";

export type RevenueByCounterTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  selectedDates?: string[];
  enabled?: boolean;
  isLoading?: boolean;
  data?: GetRevenueByCounterApiResponse;
};

export const RevenueByCounterTable: React.FC<RevenueByCounterTableProps> = ({
  fromTimestamp,
  toTimestamp,
  selectedDates,
  enabled = true,
  isLoading = false,
  data,
}) => {
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("md"));

  const dateStr = React.useMemo(() => {
    if (selectedDates && selectedDates.length > 1) {
      return t("overview.selectedDatesCount", { count: selectedDates.length });
    }
    return fromTimestamp?.toISODate() ?? toTimestamp?.toISODate() ?? "Total";
  }, [fromTimestamp, selectedDates, t, toTimestamp]);

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

  const filteredRevenueTotal = React.useMemo(
    () => filteredData.reduce((sum, counter) => sum + Number(counter.revenue || 0), 0),
    [filteredData]
  );
  const filteredOrderCount = React.useMemo(
    () => filteredData.reduce((sum, counter) => sum + Number(counter.order_count || 0), 0),
    [filteredData]
  );

  if (!enabled) {
    return null;
  }

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
          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("overview.searchCounters")}
          />

          {isSmallMobile ? (
            <Stack spacing={1}>
              {filteredData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", textAlign: "center", py: 2 }}>
                  {t("overview.noCountersMatchFilter")}
                </Typography>
              ) : (
                <>
                  {filteredData.map((counter) => (
                    <Box
                      key={counter.till_id}
                      sx={{
                        border: (theme) =>
                          `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
                        borderRadius: 1,
                        p: 1.25,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{counter.till_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                          {t("overview.orders")}: {counter.order_count}
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#73BF69" }}>
                          {formatCurrency(counter.revenue)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      borderTop: (theme) =>
                        `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.18)"}`,
                      pt: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                      {t("overview.total")}: {formatCurrency(filteredRevenueTotal)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                      {t("overview.orders")}: {filteredOrderCount}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          ) : (
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
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
