import { Grid } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { DateTimePicker } from "@mui/x-date-pickers";
import { TillStatsTable } from "./TillStatsTable";
import { ProductStatsCard } from "./ProductStatsCard";
import { DepositStatsCard } from "./DepositStatsCard";
import { VoucherStatsCard } from "./VoucherStatsCard";

export const EventOverview: React.FC = () => {
  const { t } = useTranslation();
  const [fromTimestamp, setFromTimestamp] = React.useState<DateTime | undefined>(undefined);
  const [toTimestamp, setToTimestamp] = React.useState<DateTime | undefined>(undefined);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <DateTimePicker
          label={t("overview.fromTimestamp")}
          value={fromTimestamp}
          onChange={(val) => setFromTimestamp(val ?? undefined)}
        />
        <DateTimePicker
          label={t("overview.toTimestamp")}
          value={toTimestamp}
          onChange={(val) => setToTimestamp(val ?? undefined)}
          sx={{ ml: 1 }}
        />
      </Grid>
      <Grid item xs={4}>
        <ProductStatsCard
          fromTimestamp={fromTimestamp?.toISO() ?? undefined}
          toTimestamp={toTimestamp?.toISO() ?? undefined}
        />
      </Grid>
      <Grid item xs={4}>
        <DepositStatsCard
          fromTimestamp={fromTimestamp?.toISO() ?? undefined}
          toTimestamp={toTimestamp?.toISO() ?? undefined}
        />
      </Grid>
      <Grid item xs={4}>
        <VoucherStatsCard
          fromTimestamp={fromTimestamp?.toISO() ?? undefined}
          toTimestamp={toTimestamp?.toISO() ?? undefined}
        />
      </Grid>
      <Grid item xs={12}>
        <TillStatsTable
          fromTimestamp={fromTimestamp?.toISO() ?? undefined}
          toTimestamp={toTimestamp?.toISO() ?? undefined}
        />
      </Grid>
    </Grid>
  );
};
