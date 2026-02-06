import * as React from "react";
import { withPrivilegeGuard } from "@/app/layout";
import { NodeSeenByUser, useGetAvailableDatesQuery, useListTillsQuery, useListProductsQuery, useGetRevenuePredictionQuery, api } from "@/api";
import { Privilege } from "@stustapay/models";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, Grid, Stack, FormControl, InputLabel, Select, MenuItem, Button, Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";
import {
  useAppDispatch,
  useAppSelector,
  selectStatsPollingInterval,
  selectStatsExpandedSections,
  setStatsPollingInterval,
  setStatsSectionExpanded,
} from "@/store";
import { Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { DashboardKPIs } from "./DashboardKPIs";
import { RevenueByCounterChart } from "./RevenueByCounterChart";
import { RevenueByProductChart } from "./RevenueByProductChart";
import { RevenueByCounterTable } from "./RevenueByCounterTable";
import { QuantitiesByProductTable } from "./QuantitiesByProductTable";
import { OrdersTable } from "./OrdersTable";
import { RevenuePredictionChart } from "./RevenuePredictionChart";

type SectionKey =
  | "filters"
  | "kpis"
  | "prediction"
  | "counterChart"
  | "productChart"
  | "quantityTable"
  | "counterTable"
  | "orders";

export const NodeStats: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();
  const { currentNode } = useCurrentNode();
  const dispatch = useAppDispatch();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedSubnodeId, setSelectedSubnodeId] = React.useState<number | undefined>(undefined);
  const [selectedTillId, setSelectedTillId] = React.useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = React.useState<number | undefined>(undefined);
  const pollingIntervalMs = useAppSelector(selectStatsPollingInterval);
  const expandedSections = useAppSelector(selectStatsExpandedSections) as Record<SectionKey, boolean>;

  const effectiveFilterNodeId = selectedSubnodeId ?? currentNode.id;

  const subnodeOptions = React.useMemo(() => {
    const options: Array<{ id: number; name: string; depth: number }> = [];
    const queue: Array<{ node: NodeSeenByUser; depth: number }> = currentNode.children.map((child) => ({
      node: child,
      depth: 1,
    }));

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      options.push({ id: current.node.id, name: current.node.name, depth: current.depth });
      for (const child of current.node.children) {
        queue.push({ node: child, depth: current.depth + 1 });
      }
    }

    return options;
  }, [currentNode]);

  React.useEffect(() => {
    if (selectedSubnodeId === undefined) {
      return;
    }

    const isValidSelection = subnodeOptions.some((option) => option.id === selectedSubnodeId);
    if (!isValidSelection) {
      setSelectedSubnodeId(undefined);
      setSelectedTillId(undefined);
      setSelectedProductId(undefined);
    }
  }, [selectedSubnodeId, subnodeOptions]);

  const { data: availableDates } = useGetAvailableDatesQuery(
    { nodeId: currentNode.id, subnodeId: selectedSubnodeId },
    { pollingInterval: pollingIntervalMs }
  );
  const { data: tills } = useListTillsQuery({ nodeId: effectiveFilterNodeId }, { pollingInterval: pollingIntervalMs });
  const { data: products } = useListProductsQuery({ nodeId: effectiveFilterNodeId }, { pollingInterval: pollingIntervalMs });
  const { data: prediction, isLoading: isPredictionLoading } = useGetRevenuePredictionQuery(
    {
      nodeId: currentNode.id,
      tillId: selectedTillId,
      subnodeId: selectedSubnodeId,
    },
    { pollingInterval: pollingIntervalMs, skip: currentNode.event == null }
  );

  const handleManualRefresh = React.useCallback(() => {
    dispatch(api.util.invalidateTags(["stats", "orders", "tills", "products"]));
  }, [dispatch]);

  const sectionSx = {
    backgroundColor: (theme: Theme) => (theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)"),
    border: (theme: Theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
    boxShadow: "none",
    "&::before": { display: "none" },
  };

  const summaryTextSx = {
    fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: { xs: "0.2px", sm: "0.3px", md: "0.5px" },
    color: "text.secondary",
  };

  const handleSectionToggle = React.useCallback(
    (section: SectionKey) => (_event: React.SyntheticEvent, expanded: boolean) => {
      dispatch(setStatsSectionExpanded({ section, expanded }));
    },
    [dispatch]
  );

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
        <Accordion
          expanded={expandedSections.filters}
          onChange={handleSectionToggle("filters")}
          disableGutters
          sx={sectionSx}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={summaryTextSx}>{t("overview.dashboardFilters")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 1.5, md: 2 }}
              alignItems={{ xs: "stretch", sm: "center" }}
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

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
              <InputLabel id="subnode-select-label" shrink>{t("overview.filterSubnode")}</InputLabel>
              <Select
                labelId="subnode-select-label"
                id="subnode-select"
                value={selectedSubnodeId ?? ""}
                label={t("overview.filterSubnode")}
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  setSelectedSubnodeId(val === "" ? undefined : (val as number));
                  setSelectedTillId(undefined);
                  setSelectedProductId(undefined);
                }}
                displayEmpty
                notched
              >
                <MenuItem value="">
                  <em>{t("overview.allSubnodes")}</em>
                </MenuItem>
                {subnodeOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {`${"  ".repeat(Math.max(0, option.depth - 1))}${option.name}`}
                  </MenuItem>
                ))}
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

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
              <InputLabel id="polling-select-label" shrink>{t("overview.pollingInterval")}</InputLabel>
              <Select
                labelId="polling-select-label"
                id="polling-select"
                value={pollingIntervalMs}
                label={t("overview.pollingInterval")}
                onChange={(e) => dispatch(setStatsPollingInterval(Number(e.target.value)))}
                notched
              >
                <MenuItem value={0}>
                  <em>{t("overview.pollingOff")}</em>
                </MenuItem>
                <MenuItem value={5000}>5s</MenuItem>
                <MenuItem value={10000}>10s</MenuItem>
                <MenuItem value={30000}>30s</MenuItem>
                <MenuItem value={60000}>60s</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleManualRefresh}
              sx={{ minWidth: { xs: "100%", sm: 120 }, height: 40 }}
            >
              {t("refresh")}
            </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Grid>
      <Grid size={12}>
        <Accordion expanded={expandedSections.kpis} onChange={handleSectionToggle("kpis")} disableGutters sx={sectionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={summaryTextSx}>{t("overview.overviewMetrics")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
            <DashboardKPIs
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              productId={selectedProductId}
              prediction={prediction}
              isPredictionLoading={isPredictionLoading}
              pollingIntervalMs={pollingIntervalMs}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
      {/* Revenue prediction chart - only show when no product filter is active */}
      {selectedProductId === undefined && prediction && (
        <Grid size={12}>
          <Accordion expanded={expandedSections.prediction} onChange={handleSectionToggle("prediction")} disableGutters sx={sectionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={summaryTextSx}>{t("overview.revenuePredictionChart")}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
              <RevenuePredictionChart prediction={prediction} isLoading={isPredictionLoading} />
            </AccordionDetails>
          </Accordion>
        </Grid>
      )}
      {/* Only show revenue by counter when no product is selected (not filterable by product) */}
      {selectedProductId === undefined && (
        <Grid size={12}>
          <Accordion expanded={expandedSections.counterChart} onChange={handleSectionToggle("counterChart")} disableGutters sx={sectionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={summaryTextSx}>{t("overview.revenuePerCounterChart")}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
              <RevenueByCounterChart
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              pollingIntervalMs={pollingIntervalMs}
              onBarClick={(tillId) => setSelectedTillId(tillId)}
              onClearFilter={() => setSelectedTillId(undefined)}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      )}
      <Grid size={12}>
        <Accordion expanded={expandedSections.productChart} onChange={handleSectionToggle("productChart")} disableGutters sx={sectionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={summaryTextSx}>{t("overview.revenuePerProduct")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
            <RevenueByProductChart
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              productId={selectedProductId}
              pollingIntervalMs={pollingIntervalMs}
              onProductClick={(productId) => setSelectedProductId(productId)}
              onClearFilter={() => setSelectedProductId(undefined)}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
      <Grid size={12}>
        <Accordion expanded={expandedSections.quantityTable} onChange={handleSectionToggle("quantityTable")} disableGutters sx={sectionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={summaryTextSx}>{t("overview.quantitiesPerProduct")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
            <QuantitiesByProductTable
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              productId={selectedProductId}
              pollingIntervalMs={pollingIntervalMs}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
      {/* Only show revenue by counter table when no product is selected (not filterable by product) */}
      {selectedProductId === undefined && (
        <Grid size={12}>
          <Accordion expanded={expandedSections.counterTable} onChange={handleSectionToggle("counterTable")} disableGutters sx={sectionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={summaryTextSx}>{t("overview.revenuePerCounterTable")}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
              <RevenueByCounterTable
                fromTimestamp={fromTimestamp}
                toTimestamp={toTimestamp}
                tillId={selectedTillId}
                subnodeId={selectedSubnodeId}
                pollingIntervalMs={pollingIntervalMs}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      )}
      <Grid size={12}>
        <Accordion expanded={expandedSections.orders} onChange={handleSectionToggle("orders")} disableGutters sx={sectionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={summaryTextSx}>{t("overview.orders")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
            <OrdersTable
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              productId={selectedProductId}
              pollingIntervalMs={pollingIntervalMs}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );
});
