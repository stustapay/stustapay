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
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  useCurrency = false,
  margin,
}) => {
  const formatCurrency = useCurrencyFormatter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const defaultMargin = React.useMemo(
    () => ({
      top: 10,
      right: isSmallMobile ? 30 : isMobile ? 40 : 80,
      bottom: 10,
      left: isSmallMobile ? 30 : isMobile ? 40 : 80,
      ...margin,
    }),
    [isMobile, isSmallMobile, margin]
  );

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={data}
        margin={defaultMargin}
        innerRadius={0.6}
        padAngle={1}
        cornerRadius={2}
        activeOuterRadiusOffset={6}
        colors={["#73BF69", "#F2495C", "#FFA726", "#42A5F5", "#AB47BC"]}
        borderWidth={0}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={isDark ? "#a1a5b9" : "#6b7280"}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color", modifiers: [["opacity", 0.6]] }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#ffffff"
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
        legends={
          isMobile
            ? []
            : [
                {
                  anchor: "right",
                  direction: "column",
                  justify: false,
                  translateX: 20,
                  translateY: 0,
                  itemsSpacing: 4,
                  itemWidth: 80,
                  itemHeight: 16,
                  itemTextColor: isDark ? "#a1a5b9" : "#6b7280",
                  itemDirection: "left-to-right",
                  itemOpacity: 1,
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]
        }
      />
    </div>
  );
};
