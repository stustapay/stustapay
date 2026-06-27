import { Grid, Skeleton } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useGetEntryStatsQuery, useGetPayOutStatsQuery, useGetTopUpStatsQuery } from "@/api";
import { CollapsibleStatsPanel, DailyStatsTable, HourlyGraph } from "@/components";
import { useCurrentNode } from "@/hooks";

import { PaymentMethodStatsCard } from "./PaymentMethodStatsCard";
import { VoucherStatsCard } from "./VoucherStatsCard";

const EntryStats: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  pollingInterval: number;
}> = ({ nodeId, fromTimestamp, toTimestamp, groupByDay, dailyEndTime, useRevenue, pollingInterval }) => {
  const { data } = useGetEntryStatsQuery(
    {
      nodeId: nodeId,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
    },
    { pollingInterval }
  );

  if (!data) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 10 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 10 }} sx={{ height: 300 }}>
        <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} useRevenue={useRevenue} data={data} />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }} sx={{ height: 300 }}>
        <DailyStatsTable data={data} useRevenue={useRevenue} />
      </Grid>
    </Grid>
  );
};

const TopUpStats: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  pollingInterval: number;
}> = ({ nodeId, fromTimestamp, toTimestamp, groupByDay, dailyEndTime, useRevenue, pollingInterval }) => {
  const { data } = useGetTopUpStatsQuery(
    {
      nodeId: nodeId,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
    },
    { pollingInterval }
  );

  if (!data) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 9 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 9 }} sx={{ height: 300 }}>
        <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} useRevenue={useRevenue} data={data} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }} sx={{ height: 300 }}>
        <DailyStatsTable data={data} useRevenue={useRevenue} />
      </Grid>
    </Grid>
  );
};

const PayOutStats: React.FC<{
  nodeId: number;
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  pollingInterval: number;
}> = ({ nodeId, fromTimestamp, toTimestamp, groupByDay, dailyEndTime, useRevenue, pollingInterval }) => {
  const { data } = useGetPayOutStatsQuery(
    {
      nodeId: nodeId,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
    },
    { pollingInterval }
  );

  if (!data) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 9 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }} sx={{ height: 300 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 9 }} sx={{ height: 300 }}>
        <HourlyGraph dailyEndTime={dailyEndTime} groupByDay={groupByDay} useRevenue={useRevenue} data={data} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }} sx={{ height: 300 }}>
        <DailyStatsTable data={data} useRevenue={useRevenue} />
      </Grid>
    </Grid>
  );
};

export type EventStatsProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  dailyEndTime: string;
  groupByDay: boolean;
  useRevenue: boolean;
  pollingInterval: number;
};

export const EventStats: React.FC<EventStatsProps> = ({
  fromTimestamp,
  dailyEndTime,
  toTimestamp,
  groupByDay,
  useRevenue,
  pollingInterval,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const isoFromTimestamp = fromTimestamp?.toISO() ?? undefined;
  const isoToTimestamp = toTimestamp?.toISO() ?? undefined;

  return (
    <>
      <Grid size={{ xs: 12, md: 4 }}>
        <VoucherStatsCard
          fromTimestamp={isoFromTimestamp}
          toTimestamp={isoToTimestamp}
          pollingInterval={pollingInterval}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <PaymentMethodStatsCard
          fromTimestamp={fromTimestamp}
          toTimestamp={toTimestamp}
          useRevenue={useRevenue}
          pollingInterval={pollingInterval}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CollapsibleStatsPanel title={t("overview.entryStats")}>
          <EntryStats
            nodeId={currentNode.id}
            dailyEndTime={dailyEndTime}
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            groupByDay={groupByDay}
            useRevenue={useRevenue}
            pollingInterval={pollingInterval}
          />
        </CollapsibleStatsPanel>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CollapsibleStatsPanel title={t("overview.topUpStats")}>
          <TopUpStats
            nodeId={currentNode.id}
            dailyEndTime={dailyEndTime}
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            groupByDay={groupByDay}
            useRevenue={useRevenue}
            pollingInterval={pollingInterval}
          />
        </CollapsibleStatsPanel>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CollapsibleStatsPanel title={t("overview.payOutStats")}>
          <PayOutStats
            nodeId={currentNode.id}
            dailyEndTime={dailyEndTime}
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            groupByDay={groupByDay}
            useRevenue={useRevenue}
            pollingInterval={pollingInterval}
          />
        </CollapsibleStatsPanel>
      </Grid>
    </>
  );
};
