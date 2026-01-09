import * as React from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@mui/material/styles";
import { useCurrencyFormatter } from "@/hooks";

export type BarChartData = {
  id: string;
  value: number;
  label?: string;
};

export type BarChartProps = {
  data: BarChartData[];
  height?: number;
  useCurrency?: boolean;
  horizontal?: boolean;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  useCurrency = false,
  horizontal = false,
  margin,
}) => {
  const formatCurrency = useCurrencyFormatter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const defaultMargin = {
    top: 20,
    right: 20,
    bottom: horizontal ? 80 : 60,
    left: horizontal ? 80 : 60,
    ...margin,
  };

  const nivoTheme = {
    axis: {
      domain: {
        line: {
          stroke: isDark ? "#a1a5b9" : "#6b7280",
          strokeWidth: 1,
        },
      },
      ticks: {
        line: {
          stroke: isDark ? "#a1a5b9" : "#6b7280",
          strokeWidth: 1,
        },
        text: {
          fill: isDark ? "#a1a5b9" : "#6b7280",
          fontSize: 11,
        },
      },
      legend: {
        text: {
          fill: isDark ? "#a1a5b9" : "#6b7280",
          fontSize: 11,
        },
      },
    },
    grid: {
      line: {
        stroke: isDark ? "#2e303e" : "#e5e7eb",
        strokeWidth: 1,
      },
    },
  };

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data}
        keys={["value"]}
        indexBy="id"
        layout={horizontal ? "horizontal" : "vertical"}
        margin={defaultMargin}
        padding={0.2}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={["#73BF69"]}
        theme={nivoTheme}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: horizontal ? 0 : -45,
          legend: horizontal ? undefined : "Category",
          legendPosition: "middle",
          legendOffset: 50,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          legend: horizontal ? "Value" : undefined,
          legendPosition: "middle",
          legendOffset: horizontal ? -60 : -50,
          format: (value) => {
            if (useCurrency) {
              return formatCurrency(value);
            }
            return value.toString();
          },
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="#ffffff"
        animate={false}
        tooltip={({ value, indexValue }) => (
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
            <strong>{indexValue}</strong>: {useCurrency ? formatCurrency(value) : value}
          </div>
        )}
      />
    </div>
  );
};
