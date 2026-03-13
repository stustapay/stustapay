import * as React from "react";
import { NodeSeenByUser, useGetAvailableDatesQuery, useListTillsQuery, useListProductsQuery, useGetRevenuePredictionQuery, api } from "@/api";
import { Privilege } from "@stustapay/models";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertTitle,
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useCurrentEventSettings, useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";
import { Navigate } from "react-router-dom";
import {
  useAppDispatch,
  useAppSelector,
  selectStatsPollingInterval,
  selectStatsExpandedSections,
  setStatsPollingInterval,
  setStatsSectionExpanded,
} from "@/store";
import { Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon, AutoGraph as AutoGraphIcon } from "@mui/icons-material";
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

type DatePreset = "all" | "today" | "yesterday" | "last7" | "custom";

export const NodeStats: React.FC = () => {
  const { t } = useTranslation();
  const canViewNodeStats = useCurrentUserHasPrivilege(Privilege.view_node_stats);
  const canAdminNode = useCurrentUserHasPrivilege(Privilege.node_administration);
  const { eventSettings } = useCurrentEventSettings();
  const { currentNode } = useCurrentNode();
  const dispatch = useAppDispatch();
  const [datePreset, setDatePreset] = React.useState<DatePreset>("all");
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedSubnodeId, setSelectedSubnodeId] = React.useState<number | undefined>(undefined);
  const [selectedTillId, setSelectedTillId] = React.useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = React.useState<number | undefined>(undefined);
  const [isPredictionEnabled, setIsPredictionEnabled] = React.useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
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
    {
      pollingInterval: pollingIntervalMs,
      skip: currentNode.event == null || !isPredictionEnabled || selectedProductId !== undefined,
    }
  );

  const handleManualRefresh = React.useCallback(() => {
    dispatch(api.util.invalidateTags(["stats", "orders", "tills", "products"]));
  }, [dispatch]);

  const clearAllFilterSelections = React.useCallback(() => {
    setDatePreset("all");
    setSelectedDate(null);
    setSelectedSubnodeId(undefined);
    setSelectedTillId(undefined);
    setSelectedProductId(undefined);
  }, []);

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
  const summarySx = {
    minHeight: { xs: 40, sm: 46, md: 48 },
    px: { xs: 1, sm: 1.5, md: 2 },
    "& .MuiAccordionSummary-content": {
      my: { xs: 0.5, sm: 0.75, md: 1 },
    },
    "& .MuiAccordionSummary-expandIconWrapper .MuiSvgIcon-root": {
      fontSize: { xs: "1.1rem", sm: "1.2rem" },
    },
  };

  const handleSectionToggle = React.useCallback(
    (section: SectionKey) => (_event: React.SyntheticEvent, expanded: boolean) => {
      dispatch(setStatsSectionExpanded({ section, expanded }));
    },
    [dispatch]
  );

  const dailyEndParts = React.useMemo(() => {
    if (!eventSettings.daily_end_time) {
      return { hour: 0, minute: 0, second: 0 };
    }
    const timeParts = eventSettings.daily_end_time.split(":");
    return {
      hour: parseInt(timeParts[0], 10) || 0,
      minute: parseInt(timeParts[1], 10) || 0,
      second: parseInt(timeParts[2], 10) || 0,
    };
  }, [eventSettings.daily_end_time]);

  const businessDayStartForDate = React.useCallback(
    (date: DateTime) => date.startOf("day").set({ ...dailyEndParts, millisecond: 0 }),
    [dailyEndParts]
  );

  const currentBusinessDayStart = React.useMemo(() => {
    const now = DateTime.now();
    const boundaryToday = businessDayStartForDate(now);
    return now < boundaryToday ? boundaryToday.minus({ days: 1 }) : boundaryToday;
  }, [businessDayStartForDate]);

  // Determine timestamp bounds based on selected date and event settings
  const fromTimestamp = React.useMemo(() => {
    if (datePreset === "all") {
      return undefined;
    }
    if (datePreset === "today") {
      return currentBusinessDayStart;
    }
    if (datePreset === "yesterday") {
      return currentBusinessDayStart.minus({ days: 1 });
    }
    if (datePreset === "last7") {
      return currentBusinessDayStart.minus({ days: 6 });
    }
    if (!selectedDate) {
      return undefined;
    }

    const dt = DateTime.fromISO(selectedDate);
    if (eventSettings.daily_end_time) {
      return businessDayStartForDate(dt);
    }
    return dt.startOf("day");
  }, [datePreset, selectedDate, eventSettings.daily_end_time, currentBusinessDayStart, businessDayStartForDate]);

  const toTimestamp = React.useMemo(() => {
    if (!fromTimestamp) return undefined;

    if (datePreset === "last7") {
      return fromTimestamp.plus({ days: 7 }).minus({ milliseconds: 1 });
    }
    return fromTimestamp.plus({ days: 1 }).minus({ milliseconds: 1 });
  }, [fromTimestamp, datePreset]);

  const selectedSubnodeName = React.useMemo(
    () => subnodeOptions.find((node) => node.id === selectedSubnodeId)?.name,
    [subnodeOptions, selectedSubnodeId]
  );

  const selectedTillName = React.useMemo(
    () => (selectedTillId !== undefined ? tills?.entities[selectedTillId]?.name : undefined),
    [selectedTillId, tills]
  );

  const selectedProductName = React.useMemo(
    () => (selectedProductId !== undefined ? products?.entities[selectedProductId]?.name : undefined),
    [selectedProductId, products]
  );

  const dateFilterLabel = React.useMemo(() => {
    if (datePreset === "today") return t("overview.today");
    if (datePreset === "yesterday") return t("overview.yesterday");
    if (datePreset === "last7") return t("overview.last7Days");
    if (datePreset === "custom" && selectedDate) return DateTime.fromISO(selectedDate).toLocaleString(DateTime.DATE_MED);
    return undefined;
  }, [datePreset, selectedDate, t]);

  const hasActiveFilters =
    dateFilterLabel !== undefined ||
    selectedSubnodeId !== undefined ||
    selectedTillId !== undefined ||
    selectedProductId !== undefined;

  if (!canViewNodeStats && !canAdminNode) {
    return <Navigate to="/" />;
  }

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
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
            <Typography sx={summaryTextSx}>{t("overview.dashboardFilters")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
            <Stack direction="column" spacing={{ xs: 1, sm: 1.5, md: 2 }}>
              <Grid container spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="date-select-label" shrink>
                      {t("overview.filterDate")}
                    </InputLabel>
                    <Select
                      labelId="date-select-label"
                      id="date-select"
                      value={selectedDate ?? ""}
                      label={t("overview.filterDate")}
                      onChange={(e) => {
                        const val = e.target.value as string;
                        if (val === "") {
                          setSelectedDate(null);
                          setDatePreset("all");
                          return;
                        }
                        setSelectedDate(val);
                        setDatePreset("custom");
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
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="subnode-select-label" shrink>
                      {t("overview.filterSubnode")}
                    </InputLabel>
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
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleManualRefresh}
                    fullWidth
                    sx={{ height: 40 }}
                  >
                    {t("refresh")}
                  </Button>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Button
                    size="small"
                    variant={showAdvancedFilters ? "contained" : "outlined"}
                    onClick={() => setShowAdvancedFilters((prev) => !prev)}
                    fullWidth
                    sx={{ height: 40 }}
                  >
                    {showAdvancedFilters ? t("overview.hideAdvancedFilters") : t("overview.advancedFilters")}
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" fullWidth>
                      <InputLabel id="polling-select-label" shrink>
                        {t("overview.pollingInterval")}
                      </InputLabel>
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
                        <MenuItem value={30000}>30s</MenuItem>
                        <MenuItem value={60000}>1min</MenuItem>
                        <MenuItem value={300000}>5min</MenuItem>
                        <MenuItem value={1800000}>30min</MenuItem>
                      </Select>
                    </FormControl>
                    <Tooltip title={isPredictionEnabled ? t("overview.disablePrediction") : t("overview.enablePrediction")}>
                      <IconButton
                        size="small"
                        onClick={() => setIsPredictionEnabled((prev) => !prev)}
                        aria-label={isPredictionEnabled ? t("overview.disablePrediction") : t("overview.enablePrediction")}
                        sx={{
                          width: 40,
                          height: 40,
                          border: (theme) =>
                            `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"}`,
                          color: isPredictionEnabled ? "#42A5F5" : "text.secondary",
                        }}
                      >
                        <AutoGraphIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Chip
                  label={t("overview.allDates")}
                  color={datePreset === "all" ? "primary" : "default"}
                  size="small"
                  onClick={() => {
                    setDatePreset("all");
                    setSelectedDate(null);
                  }}
                />
                <Chip
                  label={t("overview.today")}
                  color={datePreset === "today" ? "primary" : "default"}
                  size="small"
                  onClick={() => {
                    setDatePreset("today");
                    setSelectedDate(null);
                  }}
                />
                <Chip
                  label={t("overview.yesterday")}
                  color={datePreset === "yesterday" ? "primary" : "default"}
                  size="small"
                  onClick={() => {
                    setDatePreset("yesterday");
                    setSelectedDate(null);
                  }}
                />
                <Chip
                  label={t("overview.last7Days")}
                  color={datePreset === "last7" ? "primary" : "default"}
                  size="small"
                  onClick={() => {
                    setDatePreset("last7");
                    setSelectedDate(null);
                  }}
                />
              </Stack>

              {showAdvancedFilters && (
                <Grid container spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="till-select-label" shrink>
                        {t("overview.filterTill")}
                      </InputLabel>
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
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="product-select-label" shrink>
                        {t("overview.filterProduct")}
                      </InputLabel>
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
                  </Grid>

                </Grid>
              )}

              {hasActiveFilters && (
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                >
                  {dateFilterLabel && (
                    <Chip
                      size="small"
                      label={`${t("overview.filterDate")}: ${dateFilterLabel}`}
                      onDelete={() => {
                        setDatePreset("all");
                        setSelectedDate(null);
                      }}
                    />
                  )}
                  {selectedSubnodeId !== undefined && (
                    <Chip
                      size="small"
                      label={`${t("overview.filterSubnode")}: ${selectedSubnodeName ?? selectedSubnodeId}`}
                      onDelete={() => {
                        setSelectedSubnodeId(undefined);
                        setSelectedTillId(undefined);
                        setSelectedProductId(undefined);
                      }}
                    />
                  )}
                  {selectedTillId !== undefined && (
                    <Chip
                      size="small"
                      label={`${t("overview.filterTill")}: ${selectedTillName ?? selectedTillId}`}
                      onDelete={() => setSelectedTillId(undefined)}
                    />
                  )}
                  {selectedProductId !== undefined && (
                    <Chip
                      size="small"
                      label={`${t("overview.filterProduct")}: ${selectedProductName ?? selectedProductId}`}
                      onDelete={() => setSelectedProductId(undefined)}
                    />
                  )}
                  <Button size="small" variant="text" onClick={clearAllFilterSelections}>
                    {t("overview.clearAllFilters")}
                  </Button>
                </Stack>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Grid>
      <Grid size={12}>
        <Accordion expanded={expandedSections.kpis} onChange={handleSectionToggle("kpis")} disableGutters sx={sectionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
            <Typography sx={summaryTextSx}>{t("overview.overviewMetrics")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 0.75, sm: 1, md: 1.5 } }}>
            <DashboardKPIs
              fromTimestamp={fromTimestamp}
              toTimestamp={toTimestamp}
              tillId={selectedTillId}
              subnodeId={selectedSubnodeId}
              productId={selectedProductId}
              prediction={isPredictionEnabled ? prediction : undefined}
              isPredictionLoading={isPredictionEnabled ? isPredictionLoading : false}
              pollingIntervalMs={pollingIntervalMs}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
      {/* Revenue prediction chart - only show when no product filter is active */}
      {isPredictionEnabled && selectedProductId === undefined && prediction && (
        <Grid size={12}>
          <Accordion expanded={expandedSections.prediction} onChange={handleSectionToggle("prediction")} disableGutters sx={sectionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={summarySx}>
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
};
