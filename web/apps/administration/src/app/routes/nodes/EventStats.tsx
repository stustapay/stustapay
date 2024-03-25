import * as React from "react";
import { DateTime } from "luxon";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import { EntryStats, useGetEntryStatsQuery } from "@/api";
import { DailyStatsTable, HourlyGraph } from "@/components";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";

const HourlyEntryGraph: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
}> = ({ nodeId, fromTimestamp, toTimestamp, groupByDay, dailyEndTime }) => {
  const { data: stats } = useGetEntryStatsQuery({
    nodeId: nodeId,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    interval: "hourly",
  });

  const data = React.useMemo(() => {
    if (!stats) {
      return;
    }

    return {
      intervals: stats.intervals.map((interval) => ({
        timestamp: DateTime.fromISO(interval.from_time),
        value: interval.n_entries_sold,
      })),
    };
  }, [stats]);

  if (!data) {
    return null;
  }

  return <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} labelY="entries" data={data} />;
};

const DailyEntryStatsTable: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
}> = ({ nodeId, fromTimestamp, toTimestamp }) => {
  const { data: stats } = useGetEntryStatsQuery({
    nodeId: nodeId,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    interval: "daily",
  });

  const transformedStats = React.useMemo(() => {
    if (!stats) {
      return undefined;
    }
    return stats.intervals.map((interval) => {
      const d = DateTime.fromISO(interval.from_time);
      return {
        day: d.toFormat("cccc"),
        value: interval.n_entries_sold,
      };
    });
  }, [stats]);

  if (!transformedStats) {
    return null;
  }

  return <DailyStatsTable data={transformedStats} labelValue="Count" />;
};

const HourlyTopUpGraph: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  groupByDay: boolean;
  dailyEndTime: string;
}> = ({ nodeId, fromTimestamp, toTimestamp, groupByDay, dailyEndTime }) => {
  // const { data: stats } = useGetEntryStatsQuery({
  //   nodeId: nodeId,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  //   interval: "hourly",
  // });

  const stats: EntryStats = React.useMemo(
    () => ({
      from_time: "2024-03-24T09:00:00",
      to_time: "2024-03-25T17:00:00",
      intervals: [
        { from_time: "2024-03-24T09:00:00", to_time: "2024-03-24T10:00:00", n_entries_sold: 10 },
        { from_time: "2024-03-24T10:00:00", to_time: "2024-03-24T11:00:00", n_entries_sold: 121 },
        { from_time: "2024-03-24T11:00:00", to_time: "2024-03-24T12:00:00", n_entries_sold: 402 },
        { from_time: "2024-03-24T12:00:00", to_time: "2024-03-24T13:00:00", n_entries_sold: 313 },
        { from_time: "2024-03-24T13:00:00", to_time: "2024-03-24T14:00:00", n_entries_sold: 228 },
        { from_time: "2024-03-24T14:00:00", to_time: "2024-03-24T15:00:00", n_entries_sold: 131 },
        { from_time: "2024-03-24T15:00:00", to_time: "2024-03-24T16:00:00", n_entries_sold: 33 },
        { from_time: "2024-03-24T16:00:00", to_time: "2024-03-24T17:00:00", n_entries_sold: 123 },
        { from_time: "2024-03-24T17:00:00", to_time: "2024-03-24T18:00:00", n_entries_sold: 102 },
        { from_time: "2024-03-24T18:00:00", to_time: "2024-03-24T19:00:00", n_entries_sold: 330 },
        { from_time: "2024-03-24T19:00:00", to_time: "2024-03-24T20:00:00", n_entries_sold: 150 },
        { from_time: "2024-03-24T20:00:00", to_time: "2024-03-24T21:00:00", n_entries_sold: 40 },
        { from_time: "2024-03-24T21:00:00", to_time: "2024-03-24T22:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-24T22:00:00", to_time: "2024-03-24T23:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-24T23:00:00", to_time: "2024-03-25T00:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T00:00:00", to_time: "2024-03-25T01:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T01:00:00", to_time: "2024-03-25T02:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T02:00:00", to_time: "2024-03-25T03:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T03:00:00", to_time: "2024-03-25T04:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T04:00:00", to_time: "2024-03-25T05:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T05:00:00", to_time: "2024-03-25T06:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T06:00:00", to_time: "2024-03-25T07:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T07:00:00", to_time: "2024-03-25T08:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T08:00:00", to_time: "2024-03-25T09:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T09:00:00", to_time: "2024-03-25T10:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T10:00:00", to_time: "2024-03-25T11:00:00", n_entries_sold: 0 },
        { from_time: "2024-03-25T11:00:00", to_time: "2024-03-25T12:00:00", n_entries_sold: 20 },
        { from_time: "2024-03-25T12:00:00", to_time: "2024-03-25T13:00:00", n_entries_sold: 43 },
        { from_time: "2024-03-25T13:00:00", to_time: "2024-03-25T14:00:00", n_entries_sold: 231 },
        { from_time: "2024-03-25T14:00:00", to_time: "2024-03-25T15:00:00", n_entries_sold: 421 },
        { from_time: "2024-03-25T15:00:00", to_time: "2024-03-25T16:00:00", n_entries_sold: 430 },
        { from_time: "2024-03-25T16:00:00", to_time: "2024-03-25T17:00:00", n_entries_sold: 532 },
      ],
    }),
    []
  );

  const data = React.useMemo(() => {
    if (!stats) {
      return;
    }

    return {
      intervals: stats.intervals.map((interval) => ({
        timestamp: DateTime.fromISO(interval.from_time),
        value: interval.n_entries_sold,
      })),
    };
  }, [stats]);

  if (!data) {
    return null;
  }

  return <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} labelY="entries" data={data} />;
};

const DailyTopUpStatsTable: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
}> = ({ nodeId, fromTimestamp, toTimestamp }) => {
  const { data: stats } = useGetEntryStatsQuery({
    nodeId: nodeId,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    interval: "daily",
  });

  // const stats: EntryStats = React.useMemo(
  //   () => ({
  //     from_time: "2024-03-24T00:00:00",
  //     to_time: "2024-03-26T23:59:59",
  //     intervals: [
  //       { from_time: "2024-03-24T00:00:00", to_time: "2024-03-24T23:59:59", n_entries_sold: 3321 },
  //       { from_time: "2024-03-25T00:00:00", to_time: "2024-03-25T23:59:59", n_entries_sold: 3422 },
  //     ],
  //   }),
  //   []
  // );

  const transformedStats = React.useMemo(() => {
    if (!stats) {
      return undefined;
    }
    return stats.intervals.map((interval) => {
      const d = DateTime.fromISO(interval.from_time);
      return {
        day: d.toFormat("cccc"),
        value: interval.n_entries_sold,
      };
    });
  }, [stats]);

  if (!transformedStats) {
    return null;
  }

  return <DailyStatsTable data={transformedStats} labelValue="Count" />;
};

export type EventStatsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
};

export const EventStats: React.FC<EventStatsProps> = ({ fromTimestamp, dailyEndTime, toTimestamp, groupByDay }) => {
  const { currentNode } = useCurrentNode();

  return (
    <>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5">Entry Stats</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={10} height={300}>
                <HourlyEntryGraph
                  nodeId={currentNode.id}
                  dailyEndTime={dailyEndTime}
                  fromTimestamp={fromTimestamp}
                  toTimestamp={toTimestamp}
                  groupByDay={groupByDay}
                />
              </Grid>
              <Grid item xs={12} md={2} height={300}>
                <DailyEntryStatsTable nodeId={currentNode.id} fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5">Top Up Stats</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={10} height={300}>
                <HourlyTopUpGraph
                  nodeId={currentNode.id}
                  dailyEndTime={dailyEndTime}
                  fromTimestamp={fromTimestamp}
                  toTimestamp={toTimestamp}
                  groupByDay={groupByDay}
                />
              </Grid>
              <Grid item xs={12} md={2} height={300}>
                <DailyTopUpStatsTable nodeId={currentNode.id} fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
};
