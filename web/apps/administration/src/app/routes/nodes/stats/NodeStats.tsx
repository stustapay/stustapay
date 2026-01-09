import * as React from "react";
import { withPrivilegeGuard } from "@/app/layout";
import { Privilege } from "@stustapay/models";
import { DateTime } from "luxon";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, Card, Divider, FormControlLabel, Grid, Stack, Switch } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";
import { EventStats } from "./EventStats";
import { NodeSpecificStats } from "./NodeSpecificStats";
import { DashboardKPIs } from "./DashboardKPIs";
import { RevenueByCounterChart } from "./RevenueByCounterChart";
import { RevenueByCounterTable } from "./RevenueByCounterTable";
import { OrdersTable } from "./OrdersTable";

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
    <Grid container spacing={1.5}>
      <Grid size={12}>
        <Card
          sx={{
            backgroundColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
            border: (theme: Theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
            boxShadow: "none",
            mb: 1.5,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2 }}>
            <DateTimePicker
              label={t("overview.fromTimestamp")}
              value={fromTimestamp}
              onChange={(val) => setFromTimestamp(val ?? undefined)}
              slotProps={{ textField: { size: "small" } }}
            />
            <DateTimePicker
              label={t("overview.toTimestamp")}
              value={toTimestamp}
              onChange={(val) => setToTimestamp(val ?? undefined)}
              slotProps={{ textField: { size: "small" } }}
            />
            <FormControlLabel
              control={<Switch checked={groupByDay} onChange={(evt) => setGroupByDay(evt.target.checked)} size="small" />}
              label={t("overview.groupByDay")}
              sx={{ ml: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={showRevenue} onChange={(evt) => setShowRevenue(evt.target.checked)} size="small" />}
              label={t("overview.showRevenue")}
            />
          </Stack>
        </Card>
      </Grid>
      {currentNode.event != null && (
        <>
          <Grid size={12}>
            <DashboardKPIs fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
          </Grid>
          <Grid size={12}>
            <RevenueByCounterChart fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
          </Grid>
          <Grid size={12}>
            <RevenueByCounterTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
          </Grid>
          <Grid size={12}>
            <OrdersTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
          </Grid>
          <Grid size={12}>
            <Divider sx={{ my: 1.5 }} />
          </Grid>
          <EventStats
            dailyEndTime={eventSettings.daily_end_time}
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            groupByDay={groupByDay}
            useRevenue={showRevenue}
          />
          <Grid size={12}>
            <Divider sx={{ my: 1.5 }} />
          </Grid>
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
