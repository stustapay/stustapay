import * as React from "react";
import { DateTime } from "luxon";
import { ResponsiveLine, Datum } from "@nivo/line";

interface Serie {
  id: string;
  data: Datum[];
}

export type Stats = {
  intervals: Array<{
    timestamp: DateTime;
    value: number;
  }>;
};

const transformHourlyEntryStats = (data: Stats, dailyEndTime: string, groupByDay: boolean): Serie[] => {
  if (data.intervals.length === 0) {
    return [];
  }
  if (groupByDay) {
    const series: Record<string, Serie> = {};
    const firstDate = data.intervals[0].timestamp;
    for (const interval of data.intervals) {
      const t = interval.timestamp;
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
      series[d].data.push({ x: modifiedT.toJSDate(), y: interval.value });
    }

    return Object.values(series).reverse();
  } else {
    return [
      {
        id: "sales",
        data: data.intervals.map((interval) => ({
          x: interval.timestamp.toJSDate(),
          y: interval.value,
        })),
      },
    ];
  }
};

export type HourlyGraphProps = {
  labelY?: string;
  dailyEndTime: string;
  groupByDay: boolean;
  data: Stats;
};

export const HourlyGraph: React.FC<HourlyGraphProps> = ({ data, dailyEndTime, labelY, groupByDay }) => {
  const transformedData = React.useMemo(
    () => transformHourlyEntryStats(data, dailyEndTime, groupByDay),
    [data, dailyEndTime, groupByDay]
  );
  console.log(transformedData);

  return (
    <ResponsiveLine
      data={transformedData}
      axisBottom={{
        format: "%H:%M",
        legend: "time",
        tickValues: "every 1 hour",
        tickRotation: -50,
        legendPosition: "middle",
        legendOffset: 45,
      }}
      axisLeft={{
        legend: labelY ?? "value",
        legendPosition: "middle",
        legendOffset: -40,
      }}
      xFormat={(value: any) => DateTime.fromJSDate(value).toISO() ?? ""}
      enablePointLabel
      enableTouchCrosshair
      curve="monotoneX"
      margin={{
        bottom: 60,
        left: 80,
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
