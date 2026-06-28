import {
  Alert,
  AlertTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { NodePrivilege } from "@stustapay/models";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";

import { EventStats } from "./EventStats";
import { NodeSpecificStats } from "./NodeSpecificStats";

const AUTO_UPDATE_OPTIONS = [
  { labelKey: "overview.autoUpdateOff", value: 0 },
  { labelKey: "overview.autoUpdate30s", value: 30_000 },
  { labelKey: "overview.autoUpdate1min", value: 60_000 },
  { labelKey: "overview.autoUpdate5min", value: 300_000 },
  { labelKey: "overview.autoUpdate30min", value: 1_800_000 },
] as const;

export const NodeStats: React.FC = withPrivilegeGuard(NodePrivilege.node_administration, () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();
  const { currentNode } = useCurrentNode();
  const [fromTimestamp, setFromTimestamp] = React.useState<DateTime | undefined>(undefined);
  const [toTimestamp, setToTimestamp] = React.useState<DateTime | undefined>(undefined);
  const [groupByDay, setGroupByDay] = React.useState(true);
  const [showRevenue, setShowRevenue] = React.useState(false);
  const [pollingInterval, setPollingInterval] = React.useState(0);

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
        <Stack direction="row" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
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
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="auto-update-label">{t("overview.autoUpdate")}</InputLabel>
            <Select
              labelId="auto-update-label"
              label={t("overview.autoUpdate")}
              value={pollingInterval}
              onChange={(event) => setPollingInterval(Number(event.target.value))}
            >
              {AUTO_UPDATE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
      {currentNode.event != null && (
        <EventStats
          dailyEndTime={eventSettings.daily_end_time}
          fromTimestamp={fromTimestamp}
          toTimestamp={toTimestamp}
          groupByDay={groupByDay}
          useRevenue={showRevenue}
          pollingInterval={pollingInterval}
        />
      )}
      <NodeSpecificStats
        dailyEndTime={eventSettings.daily_end_time}
        fromTimestamp={fromTimestamp}
        toTimestamp={toTimestamp}
        groupByDay={groupByDay}
        useRevenue={showRevenue}
        pollingInterval={pollingInterval}
      />
    </Grid>
  );
});
