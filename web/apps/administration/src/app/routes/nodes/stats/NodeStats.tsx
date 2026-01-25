import * as React from "react";
import { withPrivilegeGuard } from "@/app/layout";
import { Privilege } from "@stustapay/models";
import { DateTime } from "luxon";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, Card, Divider, Grid, Stack, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";
import { useGetAvailableDatesQuery, useListTillsQuery, useListProductsQuery, useGetRevenuePredictionQuery } from "@/api";
import { DashboardKPIs } from "./DashboardKPIs";
import { RevenueByCounterChart } from "./RevenueByCounterChart";
import { RevenueByProductChart } from "./RevenueByProductChart";
import { RevenueByCounterTable } from "./RevenueByCounterTable";
import { QuantitiesByProductTable } from "./QuantitiesByProductTable";
import { OrdersTable } from "./OrdersTable";
import { RevenuePredictionChart } from "./RevenuePredictionChart";

export const NodeStats: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();
  const { currentNode } = useCurrentNode();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTillId, setSelectedTillId] = React.useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = React.useState<number | undefined>(undefined);

  const { data: availableDates } = useGetAvailableDatesQuery({ nodeId: currentNode.id });
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: products } = useListProductsQuery({ nodeId: currentNode.id });
  const { data: prediction, isLoading: isPredictionLoading } = useGetRevenuePredictionQuery({
    nodeId: currentNode.id,
    tillId: selectedTillId,
  });

  // Determine timestamp bounds based on selected date and event settings
  // If daily_end_time is set (e.g. 05:00), the "business day" runs from 05:00 on the selected date
  // to 04:59:59 on the next day. This matches how the backend calculates daily stats.
  const fromTimestamp = React.useMemo(() => {
    if (!selectedDate) return undefined;
    const dt = DateTime.fromISO(selectedDate);
    
    if (eventSettings.daily_end_time) {
      // Parse the daily_end_time (format: "HH:mm:ss" or "HH:mm")
      const timeParts = eventSettings.daily_end_time.split(":");
      const hour = parseInt(timeParts[0], 10) || 0;
      const minute = parseInt(timeParts[1], 10) || 0;
      const second = parseInt(timeParts[2], 10) || 0;
      
      // Business day starts at daily_end_time on the selected date
      return dt.set({ hour, minute, second, millisecond: 0 });
    }
    return dt.startOf("day");
  }, [selectedDate, eventSettings.daily_end_time]);

  const toTimestamp = React.useMemo(() => {
    if (!fromTimestamp) return undefined;
    
    if (eventSettings.daily_end_time) {
      // Business day ends at daily_end_time on the next day (minus 1 millisecond)
      return fromTimestamp.plus({ days: 1 }).minus({ milliseconds: 1 });
    }
    return fromTimestamp.endOf("day");
  }, [fromTimestamp, eventSettings.daily_end_time]);

  if (eventSettings.start_date == null || eventSettings.end_date == null || eventSettings.daily_end_time == null) {
    return (
      <Alert severity="warning">
        <AlertTitle>{t("overview.warningEventDatesNeedConfiguration")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Grid container spacing={{ xs: 0.75, sm: 1, md: 1.5 }}>
      <Grid size={12}>
        <Card
          sx={{
            backgroundColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
            border: (theme: Theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
            boxShadow: "none",
            mb: { xs: 1, sm: 1.5 },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 1.5, md: 2 }}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}
          >
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel id="date-select-label" shrink>{t("overview.filterDate")}</InputLabel>
              <Select
                labelId="date-select-label"
                id="date-select"
                value={selectedDate ?? ""}
                label={t("overview.filterDate")}
                onChange={(e) => {
                  const val = e.target.value as string;
                  setSelectedDate(val === "" ? null : val);
                }}
                displayEmpty
                notched
              >
                <MenuItem value="">
                  <em>{t("overview.allDates")}</em>
                </MenuItem>
                {availableDates && availableDates.length > 0 ? (
                  availableDates.map((date) => (
                    <MenuItem key={date} value={date}>
                      {DateTime.fromISO(date).toLocaleString(DateTime.DATE_MED)}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>{t("overview.noDatesAvailable")}</MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel id="till-select-label" shrink>{t("overview.filterTill")}</InputLabel>
              <Select
                labelId="till-select-label"
                id="till-select"
                value={selectedTillId ?? ""}
                label={t("overview.filterTill")}
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  setSelectedTillId(val === "" ? undefined : (val as number));
                }}
                displayEmpty
                notched
              >
                <MenuItem value="">
                  <em>{t("overview.allTills")}</em>
                </MenuItem>
                {tills &&
                  tills.ids.map((id) => (
                    <MenuItem key={id} value={id}>
                      {tills.entities[id]?.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel id="product-select-label" shrink>{t("overview.filterProduct")}</InputLabel>
              <Select
                labelId="product-select-label"
                id="product-select"
                value={selectedProductId ?? ""}
                label={t("overview.filterProduct")}
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  setSelectedProductId(val === "" ? undefined : (val as number));
                }}
                displayEmpty
                notched
              >
                <MenuItem value="">
                  <em>{t("overview.allProducts")}</em>
                </MenuItem>
                {products &&
                  products.ids.map((id) => (
                    <MenuItem key={id} value={id}>
                      {products.entities[id]?.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </Card>
      </Grid>
      <Grid size={12}>
        <DashboardKPIs
          fromTimestamp={fromTimestamp}
          toTimestamp={toTimestamp}
          tillId={selectedTillId}
          productId={selectedProductId}
          prediction={prediction}
          isPredictionLoading={isPredictionLoading}
        />
      </Grid>
      {/* Revenue prediction chart - only show when no product filter is active */}
      {selectedProductId === undefined && prediction && (
        <Grid size={12}>
          <RevenuePredictionChart prediction={prediction} isLoading={isPredictionLoading} />
        </Grid>
      )}
      {/* Only show revenue by counter when no product is selected (not filterable by product) */}
      {selectedProductId === undefined && (
        <Grid size={12}>
          <RevenueByCounterChart
            fromTimestamp={fromTimestamp}
            toTimestamp={toTimestamp}
            tillId={selectedTillId}
            onBarClick={(tillId) => setSelectedTillId(tillId)}
            onClearFilter={() => setSelectedTillId(undefined)}
          />
        </Grid>
      )}
      <Grid size={12}>
        <RevenueByProductChart
          fromTimestamp={fromTimestamp}
          toTimestamp={toTimestamp}
          tillId={selectedTillId}
          productId={selectedProductId}
          onProductClick={(productId) => setSelectedProductId(productId)}
          onClearFilter={() => setSelectedProductId(undefined)}
        />
      </Grid>
      <Grid size={12}>
        <QuantitiesByProductTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} tillId={selectedTillId} productId={selectedProductId} />
      </Grid>
      {/* Only show revenue by counter table when no product is selected (not filterable by product) */}
      {selectedProductId === undefined && (
        <Grid size={12}>
          <RevenueByCounterTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} tillId={selectedTillId} />
        </Grid>
      )}
      <Grid size={12}>
        <OrdersTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} tillId={selectedTillId} productId={selectedProductId} />
      </Grid>
    </Grid>
  );
});
