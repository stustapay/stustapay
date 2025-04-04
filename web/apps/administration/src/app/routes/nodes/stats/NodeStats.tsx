import * as React from "react";
import { withPrivilegeGuard } from "@/app/layout";
import { Privilege } from "@stustapay/models";
import { DateTime } from "luxon";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, Divider, FormControlLabel, Grid, Stack, Switch } from "@mui/material";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";
import { EventStats } from "./EventStats";
import { NodeSpecificStats } from "./NodeSpecificStats";

export const NodeStats: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();
  const { currentNode } = useCurrentNode();
  const [fromTimestamp, setFromTimestamp] = React.useState<DateTime | undefined>(undefined);
  const [toTimestamp, setToTimestamp] = React.useState<DateTime | undefined>(undefined);
  const [groupByDay, setGroupByDay] = React.useState(true);
  const [showRevenue, setShowRevenue] = React.useState(false);

  if (eventSettings.start_date == null || eventSettings.end_date == null || eventSettings.daily_end_time == null) {
    return (
      <Alert severity="warning">
        <AlertTitle>{t("overview.warningEventDatesNeedConfiguration")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <DateTimePicker
            label={t("overview.fromTimestamp")}
            value={fromTimestamp}
            onChange={(val) => setFromTimestamp(val ?? undefined)}
          />
          <DateTimePicker
            label={t("overview.toTimestamp")}
            value={toTimestamp}
            onChange={(val) => setToTimestamp(val ?? undefined)}
          />
          <FormControlLabel
            control={<Switch checked={groupByDay} onChange={(evt) => setGroupByDay(evt.target.checked)} />}
            label={t("overview.groupByDay")}
          />
          <FormControlLabel
            control={<Switch checked={showRevenue} onChange={(evt) => setShowRevenue(evt.target.checked)} />}
            label={t("overview.showRevenue")}
          />
        </Stack>
      </Grid>
      <Divider />
      {currentNode.event != null && (
        <>
          <EventStats
            dailyEndTime={eventSettings.daily_end_time}
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            groupByDay={groupByDay}
            useRevenue={showRevenue}
          />
          <Divider />
        </>
      )}
      <NodeSpecificStats
        dailyEndTime={eventSettings.daily_end_time}
        fromTimestamp={fromTimestamp}
        toTimestamp={toTimestamp}
        groupByDay={groupByDay}
        useRevenue={showRevenue}
      />
    </Grid>
  );
});
