import * as React from "react";
import { DateTime } from "luxon";
import { ResponsiveLine } from "@nivo/line";
import { TimeseriesStats } from "@/api";
import { useCurrencyFormatter } from "@/hooks";

interface Serie {
  id: string;
  data: { x: Date; y: number }[];
}

export type Stats = {
  intervals: Array<{
    timestamp: DateTime;
    value: number;
  }>;
};

const transformHourlyEntryStats = (
  data: TimeseriesStats,
  dailyEndTime: string,
  groupByDay: boolean,
  useRevenue: boolean
): Serie[] => {
  if (data.hourly_intervals.length === 0) {
    return [];
  }

  if (groupByDay) {
    const series: Record<string, Serie> = {};
    const firstDate = DateTime.fromISO(data.hourly_intervals[0].to_time);
    for (const interval of data.hourly_intervals) {
      const t = DateTime.fromISO(interval.to_time);
      const dailyStart = DateTime.fromISO(`${t.toISODate()}T${dailyEndTime}${t.toFormat("ZZZ")}`);
      let d;
      let toPrevDay = false;
      if (t < dailyStart) {
        d = t.minus({ days: 1 }).toFormat("ccc");
        toPrevDay = true;
      } else {
        d = t.toFormat("ccc");
      }
      if (!d) {
        continue;
      }
      if (!(d in series)) {
        series[d] = {
          id: d,
          data: [],
        };
      }
      const formatted = `${firstDate.plus({ days: toPrevDay ? 1 : 0 }).toISODate()}T${t.toISOTime()}`;
      const modifiedT = DateTime.fromISO(formatted);
      series[d].data.push({ x: modifiedT.toJSDate(), y: useRevenue ? interval.revenue : interval.count });
    }

    return Object.values(series).reverse();
  } else {
    return [
      {
        id: "sales",
        data: data.hourly_intervals.map((interval) => ({
          x: DateTime.fromISO(interval.to_time).toJSDate(),
          y: useRevenue ? interval.revenue : interval.count,
        })),
      },
    ];
  }
};

export type HourlyGraphProps = {
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  data: TimeseriesStats;
};

export const HourlyGraph: React.FC<HourlyGraphProps> = ({ data, dailyEndTime, groupByDay, useRevenue }) => {
  const transformedData = React.useMemo(
    () => transformHourlyEntryStats(data, dailyEndTime, groupByDay, useRevenue),
    [data, dailyEndTime, groupByDay, useRevenue]
  );

  const formatCurrency = useCurrencyFormatter();

  return (
    <ResponsiveLine
      data={transformedData}
      colors={{ scheme: "category10" }}
      axisBottom={{
        format: "%a %H:%M",
        legend: "time",
        tickRotation: 0,
        legendPosition: "middle",
        legendOffset: 35,
      }}
      axisLeft={{
        legend: useRevenue ? "revenue per hour" : "count per hour",
        legendPosition: "middle",
        legendOffset: useRevenue ? -80 : -40,
        format: (value) => {
          if (useRevenue) {
            return formatCurrency(value);
          } else {
            return value;
          }
        },
      }}
      xFormat={(value: Date) => DateTime.fromJSDate(value).toISO() ?? ""}
      enableSlices="x"
      enableTouchCrosshair
      curve="monotoneX"
      margin={{
        bottom: 40,
        left: useRevenue ? 90 : 80,
        right: groupByDay ? 100 : 20,
        top: 20,
      }}
      useMesh
      xScale={{
        type: "time",
        useUTC: false,
      }}
      yScale={{
        type: "linear",
      }}
      legends={
        groupByDay
          ? [
              {
                anchor: "bottom-right",
                direction: "column",
                translateX: 100,
                itemDirection: "left-to-right",
                itemWidth: 80,
                itemHeight: 20,
                symbolSize: 12,
                symbolShape: "circle",
              },
            ]
          : undefined
      }
    />
  );
};
