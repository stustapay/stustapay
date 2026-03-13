import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useCurrencyFormatter } from "@/hooks";

export type PieChartData = {
  id: string;
  value: number;
  label?: string;
};

export type PieChartProps = {
  data: PieChartData[];
  height?: number;
  useCurrency?: boolean;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  showLegend?: boolean;
  legendPosition?: "right" | "bottom";
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  useCurrency = false,
  margin,
  showLegend = true,
  legendPosition = "bottom",
}) => {
  const formatCurrency = useCurrencyFormatter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // For small charts, use bottom legend which takes less horizontal space
  const isSmallChart = height < 150;
  const effectiveLegendPosition = isSmallChart ? "bottom" : legendPosition;

  const defaultMargin = React.useMemo(() => {
    if (effectiveLegendPosition === "bottom") {
      return {
        top: 5,
        right: 10,
        bottom: showLegend ? 50 : 10,
        left: 10,
        ...margin,
      };
    }
    return {
      top: 10,
      right: showLegend ? (isSmallMobile ? 80 : isMobile ? 100 : 120) : 20,
      bottom: 10,
      left: 20,
      ...margin,
    };
  }, [effectiveLegendPosition, showLegend, isMobile, isSmallMobile, margin]);

  const legendConfig = React.useMemo(() => {
    if (!showLegend) return [];
    
    if (effectiveLegendPosition === "bottom") {
      return [
        {
          anchor: "bottom" as const,
          direction: "row" as const,
          justify: false,
          translateX: 0,
          translateY: 40,
          itemsSpacing: 8,
          itemWidth: 70,
          itemHeight: 14,
          itemTextColor: isDark ? "#a1a5b9" : "#6b7280",
          itemDirection: "left-to-right" as const,
          itemOpacity: 1,
          symbolSize: 8,
          symbolShape: "circle" as const,
        },
      ];
    }
    
    return [
      {
        anchor: "right" as const,
        direction: "column" as const,
        justify: false,
        translateX: isSmallMobile ? 70 : isMobile ? 90 : 100,
        translateY: 0,
        itemsSpacing: 4,
        itemWidth: isSmallMobile ? 60 : 80,
        itemHeight: 16,
        itemTextColor: isDark ? "#a1a5b9" : "#6b7280",
        itemDirection: "left-to-right" as const,
        itemOpacity: 1,
        symbolSize: 10,
        symbolShape: "circle" as const,
      },
    ];
  }, [showLegend, effectiveLegendPosition, isDark, isMobile, isSmallMobile]);

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={data}
        margin={defaultMargin}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={3}
        activeOuterRadiusOffset={6}
        colors={["#73BF69", "#F2495C", "#FFA726", "#42A5F5", "#AB47BC"]}
        borderWidth={0}
        enableArcLinkLabels={false}
        enableArcLabels={false}
        defs={[
          {
            id: "gradient1",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#73BF69", opacity: 1 },
              { offset: 100, color: "#4CAF50", opacity: 0.85 },
            ],
          },
          {
            id: "gradient2",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#F2495C", opacity: 1 },
              { offset: 100, color: "#E91E63", opacity: 0.85 },
            ],
          },
          {
            id: "gradient3",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#FFA726", opacity: 1 },
              { offset: 100, color: "#FF9800", opacity: 0.85 },
            ],
          },
          {
            id: "gradient4",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#42A5F5", opacity: 1 },
              { offset: 100, color: "#2196F3", opacity: 0.85 },
            ],
          },
          {
            id: "gradient5",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#AB47BC", opacity: 1 },
              { offset: 100, color: "#9C27B0", opacity: 0.85 },
            ],
          },
        ]}
        fill={[
          { match: { id: data[0]?.id }, id: "gradient1" },
          { match: { id: data[1]?.id }, id: "gradient2" },
          { match: { id: data[2]?.id }, id: "gradient3" },
          { match: { id: data[3]?.id }, id: "gradient4" },
          { match: { id: data[4]?.id }, id: "gradient5" },
        ].filter((f) => f.match.id !== undefined)}
        tooltip={({ datum }) => (
          <div
            style={{
              padding: "8px 12px",
              background: isDark ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.95)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
              color: isDark ? "#ffffff" : "#000000",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          >
            <strong>{datum.id}</strong>: {useCurrency ? formatCurrency(datum.value) : datum.value}
          </div>
        )}
        legends={legendConfig}
      />
    </div>
  );
};
