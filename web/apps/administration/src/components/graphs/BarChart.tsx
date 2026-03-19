import * as React from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useCurrencyFormatter } from "@/hooks";
import { useTranslation } from "react-i18next";

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
  onBarClick?: (data: BarChartData) => void;
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  useCurrency = false,
  horizontal = false,
  margin,
  onBarClick,
}) => {
  const formatCurrency = useCurrencyFormatter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const maxCategoryLabelLength = isSmallMobile ? 10 : isMobile ? 14 : 24;
  const compactNumberFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [i18n.language]
  );

  const truncateLabel = React.useCallback(
    (value: string | number) => {
      const label = String(value);
      if (label.length <= maxCategoryLabelLength) {
        return label;
      }
      return `${label.slice(0, maxCategoryLabelLength - 1)}…`;
    },
    [maxCategoryLabelLength]
  );

  const formatValueAxisLabel = React.useCallback(
    (value: string | number) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return String(value);
      }

      if (horizontal && useCurrency && isMobile) {
        return compactNumberFormatter.format(numericValue);
      }

      return useCurrency ? formatCurrency(numericValue) : String(value);
    },
    [compactNumberFormatter, formatCurrency, horizontal, isMobile, useCurrency]
  );

  const defaultMargin = React.useMemo(() => {
    if (isSmallMobile) {
      return {
        top: 10,
        right: horizontal && useCurrency ? 72 : 8,
        bottom: horizontal ? 30 : 40,
        left: horizontal ? 62 : 36,
        ...margin,
      };
    }
    if (isMobile) {
      return {
        top: 12,
        right: horizontal && useCurrency ? 88 : 10,
        bottom: horizontal ? 34 : 45,
        left: horizontal ? 70 : 42,
        ...margin,
      };
    }
    if (isTablet) {
      return {
        top: 18,
        right: horizontal && useCurrency ? 80 : 15,
        bottom: horizontal ? 50 : 65,
        left: horizontal ? 100 : 65,
        ...margin,
      };
    }
    return {
      top: 20,
      right: horizontal && useCurrency ? 100 : 20,
      bottom: horizontal ? 60 : 80,
      left: horizontal ? 120 : 80,
      ...margin,
    };
  }, [isMobile, isSmallMobile, isTablet, horizontal, useCurrency, margin]);

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
          fontSize: isSmallMobile ? 8 : isMobile ? 9 : 11,
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

  React.useEffect(() => {
    if (onBarClick) {
      // Add global styles for bar hover effects
      const styleId = "bar-chart-hover-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .nivo-bar-chart rect {
            transition: all 0.2s ease-in-out !important;
            cursor: pointer !important;
          }
          .nivo-bar-chart rect:hover {
            opacity: 0.85 !important;
            filter: brightness(1.15) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [onBarClick]);

  return (
    <div
      className={onBarClick ? "nivo-bar-chart" : undefined}
      style={{
        height,
        cursor: onBarClick ? "pointer" : "default",
        position: "relative",
      }}
    >
      <ResponsiveBar
        data={data}
        keys={["value"]}
        indexBy="id"
        layout={horizontal ? "horizontal" : "vertical"}
        margin={defaultMargin}
        padding={0.3}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={["#73BF69"]}
        theme={nivoTheme}
        borderRadius={2}
        borderWidth={0}
        animate={true}
        motionConfig="gentle"
        defs={[
          {
            id: "barGradient",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#73BF69", opacity: 1 },
              { offset: 100, color: "#4CAF50", opacity: 0.8 },
            ],
            gradientTransform: horizontal ? "rotate(0)" : "rotate(90 0.5 0.5)",
          },
        ]}
        fill={[{ match: "*", id: "barGradient" }]}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: isSmallMobile ? 4 : isMobile ? 6 : 8,
          tickRotation: horizontal ? 0 : isSmallMobile ? -55 : isMobile ? -40 : -30,
          //legend: horizontal ? undefined : "Category",
          legendPosition: "middle",
          legendOffset: isSmallMobile ? 35 : isMobile ? 40 : 50,
          format: horizontal
            ? (value) => formatValueAxisLabel(value)
            : (value) => truncateLabel(value),
          tickValues: horizontal && isMobile ? 4 : undefined,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: isSmallMobile ? 4 : isMobile ? 6 : 8,
          tickRotation: 0,
          //legend: horizontal ? undefined : (useCurrency ? "Value" : undefined),
          legendPosition: "middle",
          legendOffset: horizontal
            ? (isSmallMobile ? -45 : isMobile ? -50 : -60)
            : (isSmallMobile ? -35 : isMobile ? -40 : -50),
          format: horizontal
            ? (value) => truncateLabel(value)
            : useCurrency
              ? (value) => formatValueAxisLabel(value)
              : undefined,
        }}
        enableLabel={!isSmallMobile}
        label={(d) => useCurrency ? formatCurrency(d.value as number) : String(d.value)}
        labelSkipWidth={isSmallMobile ? 120 : 40}
        labelSkipHeight={isSmallMobile ? 22 : 16}
        labelTextColor="#ffffff"
        labelPosition="end"
        labelOffset={8}
        isInteractive={true}
        tooltip={({ value, indexValue }) => (
          <div
            style={{
              padding: isSmallMobile ? "6px 10px" : isMobile ? "8px 12px" : "10px 14px",
              background: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.98)",
              border: isDark ? "1px solid rgba(115, 191, 105, 0.3)" : "1px solid rgba(115, 191, 105, 0.2)",
              borderRadius: "6px",
              color: isDark ? "#ffffff" : "#000000",
              fontSize: isSmallMobile ? "10px" : isMobile ? "11px" : "12px",
              maxWidth: isMobile ? "90vw" : "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <strong style={{ color: "#73BF69", fontSize: isSmallMobile ? "11px" : isMobile ? "12px" : "13px" }}>
              {indexValue}
            </strong>
            <div style={{ marginTop: "4px", fontWeight: 500, fontSize: isSmallMobile ? "10px" : isMobile ? "11px" : "12px" }}>
              {useCurrency ? formatCurrency(value) : value}
            </div>
            {onBarClick && (
              <div
                style={{
                  fontSize: isSmallMobile ? "8px" : isMobile ? "9px" : "10px",
                  opacity: 0.8,
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  color: "#73BF69",
                }}
              >
                {t("overview.clickToFilter")}
              </div>
            )}
          </div>
        )}
        onClick={onBarClick ? (data) => {
          const clickedData: BarChartData = {
            id: data.indexValue as string,
            value: data.value as number,
          };
          onBarClick(clickedData);
        } : undefined}
      />
    </div>
  );
};
