import * as React from "react";
import { Card, CardContent, Typography, Skeleton, Box, useTheme, useMediaQuery } from "@mui/material";
import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter, useCurrentEventSettings } from "@/hooks";
import { RevenuePrediction } from "@/api";

export type RevenuePredictionChartProps = {
  prediction: RevenuePrediction;
  isLoading?: boolean;
};

export const RevenuePredictionChart: React.FC<RevenuePredictionChartProps> = ({ prediction, isLoading }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { eventSettings } = useCurrentEventSettings();

  // Format hour to display in local timezone with proper formatting
  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  // Transform prediction data for the line chart
  const chartData = React.useMemo(() => {
    if (!prediction?.hourly_timeseries) return [];

    // Build actual revenue line (only up to current hour)
    const actualData = prediction.hourly_timeseries
      .filter((point) => point.cumulative_actual !== null && point.cumulative_actual !== undefined)
      .map((point) => ({
        x: formatHour(point.hour),
        y: point.cumulative_actual,
      }));

    // Build predicted revenue line (full day)
    const predictedData = prediction.hourly_timeseries.map((point) => ({
      x: formatHour(point.hour),
      y: point.cumulative_predicted,
    }));

    return [
      {
        id: t("overview.actualRevenue"),
        data: actualData,
      },
      {
        id: t("overview.predictedRevenue"),
        data: predictedData,
      },
    ];
  }, [prediction, t]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) =>
            `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Skeleton variant="text" width={200} height={24} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={isSmallMobile ? 200 : isMobile ? 250 : 300} />
        </CardContent>
      </Card>
    );
  }

  if (!prediction || chartData.length === 0) {
    return null;
  }

  const chartHeight = isSmallMobile ? 200 : isMobile ? 250 : 300;

  return (
    <Card
      sx={{
        backgroundColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
        border: (theme) =>
          `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {t("overview.revenuePredictionChart")}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: { xs: "0.65rem", sm: "0.75rem" },
            }}
          >
            {t("overview.currentRevenue")}: {formatCurrency(prediction.current_revenue)}
          </Typography>
        </Box>
        <Box sx={{ height: chartHeight }}>
          <ResponsiveLine
            data={chartData}
            colors={["#73BF69", "#42A5F5"]}
            margin={{
              top: 20,
              right: isSmallMobile ? 20 : isMobile ? 80 : 120,
              bottom: 50,
              left: isSmallMobile ? 50 : isMobile ? 60 : 80,
            }}
            xScale={{ type: "point" }}
            yScale={{
              type: "linear",
              min: 0,
              max: "auto",
            }}
            curve="monotoneX"
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: isSmallMobile ? -45 : 0,
              legend: t("overview.hourOfDay"),
              legendOffset: 40,
              legendPosition: "middle",
              tickValues: isSmallMobile ? ["00:00", "06:00", "12:00", "18:00"] : undefined,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: t("overview.cumulativeRevenue"),
              legendOffset: isSmallMobile ? -45 : isMobile ? -55 : -70,
              legendPosition: "middle",
              format: (value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              },
            }}
            enablePoints={true}
            pointSize={isSmallMobile ? 4 : 6}
            pointColor={{ theme: "background" }}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            enableArea={true}
            areaOpacity={0.15}
            useMesh={true}
            enableSlices="x"
            sliceTooltip={({ slice }) => (
              <div
                style={{
                  background: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
                  padding: "8px 12px",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                <strong>{slice.points[0]?.data.x}</strong>
                {slice.points.map((point) => (
                  <div
                    key={point.id}
                    style={{
                      color: point.seriesColor,
                      padding: "3px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: point.seriesColor,
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                    <span>{point.seriesId}:</span>
                    <strong>{formatCurrency(point.data.y as number)}</strong>
                  </div>
                ))}
              </div>
            )}
            legends={
              isMobile
                ? []
                : [
                    {
                      anchor: "bottom-right",
                      direction: "column",
                      justify: false,
                      translateX: 100,
                      translateY: 0,
                      itemsSpacing: 4,
                      itemWidth: 100,
                      itemHeight: 20,
                      itemDirection: "left-to-right",
                      itemOpacity: 1,
                      symbolSize: 12,
                      symbolShape: "circle",
                      itemTextColor: isDark ? "#a1a5b9" : "#6b7280",
                    },
                  ]
            }
            theme={{
              axis: {
                ticks: {
                  text: {
                    fill: isDark ? "#a1a5b9" : "#6b7280",
                    fontSize: isSmallMobile ? 10 : 11,
                  },
                },
                legend: {
                  text: {
                    fill: isDark ? "#a1a5b9" : "#6b7280",
                    fontSize: isSmallMobile ? 10 : 12,
                  },
                },
              },
              grid: {
                line: {
                  stroke: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                },
              },
            }}
            defs={[
              {
                id: "actualGradient",
                type: "linearGradient",
                colors: [
                  { offset: 0, color: "#73BF69", opacity: 0.4 },
                  { offset: 100, color: "#73BF69", opacity: 0 },
                ],
              },
              {
                id: "predictedGradient",
                type: "linearGradient",
                colors: [
                  { offset: 0, color: "#42A5F5", opacity: 0.3 },
                  { offset: 100, color: "#42A5F5", opacity: 0 },
                ],
              },
            ]}
            fill={[
              { match: { id: t("overview.actualRevenue") }, id: "actualGradient" },
              { match: { id: t("overview.predictedRevenue") }, id: "predictedGradient" },
            ]}
          />
        </Box>
        {/* Legend for mobile */}
        {isMobile && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#73BF69" }} />
              <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                {t("overview.actualRevenue")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#42A5F5" }} />
              <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                {t("overview.predictedRevenue")}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
