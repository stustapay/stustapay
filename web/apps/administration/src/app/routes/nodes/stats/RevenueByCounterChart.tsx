import * as React from "react";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { BarChart, BarChartData } from "@/components";
import { FilterBadge } from "@/components/common/FilterBadge";
import { useCurrentNode } from "@/hooks";
import { useGetRevenueByCounterQuery } from "@/api";
import { useTranslation } from "react-i18next";

export type RevenueByCounterChartProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  onBarClick?: (tillId: number) => void;
  onClearFilter?: () => void;
};

type SortOption = "revenue-desc" | "revenue-asc" | "name-asc" | "name-desc";

export const RevenueByCounterChart: React.FC<RevenueByCounterChartProps> = ({
  fromTimestamp,
  toTimestamp,
  tillId,
  onBarClick,
  onClearFilter,
}) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sortOption, setSortOption] = React.useState<SortOption>("revenue-desc");

  const { data, isLoading } = useGetRevenueByCounterQuery({
    nodeId: currentNode.id,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    tillId: tillId,
  });

  // Create a map of till_name to till_id for bar click handling
  // Must be called before any early returns (Rules of Hooks)
  const tillNameToIdMap = React.useMemo(() => {
    if (!data || !data.counters) return new Map<string, number>();
    const map = new Map<string, number>();
    data.counters.forEach((counter) => {
      const name = counter.till_name || String(counter.till_id);
      map.set(name, counter.till_id);
    });
    return map;
  }, [data?.counters]);

  // Filter and sort the data
  // Must be called before any early returns (Rules of Hooks)
  const chartData: BarChartData[] = React.useMemo(() => {
    if (!data || !data.counters) return [];
    
    const filtered = data.counters.filter(
      (counter) => counter.revenue != null && !isNaN(counter.revenue)
    );

    // Map to chart data format
    const mapped = filtered.map((counter) => ({
      id: counter.till_name || String(counter.till_id),
      value: Number(counter.revenue),
    }));

    // Apply sorting
    switch (sortOption) {
      case "revenue-desc":
        mapped.sort((a, b) => b.value - a.value);
        break;
      case "revenue-asc":
        mapped.sort((a, b) => a.value - b.value);
        break;
      case "name-asc":
        mapped.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case "name-desc":
        mapped.sort((a, b) => b.id.localeCompare(a.id));
        break;
    }

    return mapped;
  }, [data?.counters, sortOption]);

  const handleBarClick = React.useCallback(
    (barData: BarChartData) => {
      if (onBarClick) {
        const clickedTillId = tillNameToIdMap.get(barData.id);
        if (clickedTillId !== undefined) {
          onBarClick(clickedTillId);
        }
      }
    },
    [onBarClick, tillNameToIdMap]
  );

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
            {t("overview.revenuePerCounter")}
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
            {t("overview.revenuePerCounter")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
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
            {t("overview.revenuePerCounter")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.75, sm: 1, md: 2 }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            flexWrap="wrap"
          >
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
            {tillId !== undefined && onClearFilter && (
              <FilterBadge
                label={t("overview.filteredBy")}
                value={
                  data.counters.find((c) => c.till_id === tillId)?.till_name || String(tillId)
                }
                onClear={onClearFilter}
                visible={true}
              />
            )}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 180 },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <InputLabel id="sort-select-label">{t("overview.sortBy")}</InputLabel>
              <Select
                labelId="sort-select-label"
                id="sort-select"
                value={sortOption}
                label={t("overview.sortBy")}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                sx={{
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "#73BF69",
                  },
                }}
              >
                <MenuItem value="revenue-desc">{t("overview.revenueDescending")}</MenuItem>
                <MenuItem value="revenue-asc">{t("overview.revenueAscending")}</MenuItem>
                <MenuItem value="name-asc">{t("overview.nameAscending")}</MenuItem>
                <MenuItem value="name-desc">{t("overview.nameDescending")}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <BarChart
            data={chartData}
            height={isSmallMobile ? 180 : isMobile ? 200 : 250}
            useCurrency
            horizontal
            onBarClick={onBarClick ? handleBarClick : undefined}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
