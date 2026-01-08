import {
  EntryDirection,
  EntryScanLog,
  selectEntryAreaAll,
  selectEntryGroupAll,
  selectTerminalAll,
  useLazyExportEntryScanLogsQuery,
  useListEntryAreasQuery,
  useListEntryGroupsQuery,
  useListEntryScanLogsQuery,
  useListTerminalsQuery,
} from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { Button, Link, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Select } from "@stustapay/components";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";

type AllowedFilter = "all" | "allowed" | "denied";
type DirectionFilter = "all" | EntryDirection;

type EntryLogFilters = {
  areaId: number | null;
  groupId: number | null;
  terminalId: number | null;
  direction: DirectionFilter;
  allowed: AllowedFilter;
  tagUid: string;
  fromTime: string;
  toTime: string;
  limit: string;
  offset: string;
};

const initialFilters: EntryLogFilters = {
  areaId: null,
  groupId: null,
  terminalId: null,
  direction: "all",
  allowed: "all",
  tagUid: "",
  fromTime: "",
  toTime: "",
  limit: "200",
  offset: "0",
};

const parseTagUid = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  const isHex = /[a-fA-F]/.test(normalized);
  const parsed = parseInt(normalized, isHex ? 16 : 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toUtcIso = (value: string) => (value ? new Date(`${value}Z`).toISOString() : undefined);
const formatUtc = (value: string) => new Date(value).toLocaleString(undefined, { timeZone: "UTC" });

const formatUid = (value: number) => formatUserTagUid(value.toString(16).toUpperCase());

export const EntryLogs: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [filters, setFilters] = React.useState<EntryLogFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = React.useState<EntryLogFilters>(initialFilters);

  const { entryAreas } = useListEntryAreasQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        entryAreas: data ? selectEntryAreaAll(data) : [],
      }),
    }
  );
  const { entryGroups } = useListEntryGroupsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        entryGroups: data ? selectEntryGroupAll(data) : [],
      }),
    }
  );
  const { terminals } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data).filter((terminal) => terminal.mode !== "till") : [],
      }),
    }
  );

  const tagUidError = filters.tagUid !== "" && parseTagUid(filters.tagUid) == null;

  const queryArgs = React.useMemo(() => {
    const parsedTagUid = parseTagUid(appliedFilters.tagUid);
    const parsedLimit = Number.parseInt(appliedFilters.limit, 10);
    const parsedOffset = Number.parseInt(appliedFilters.offset, 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 200 : parsedLimit;
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;
    return {
      nodeId: currentNode.id,
      areaId: appliedFilters.areaId ?? undefined,
      groupId: appliedFilters.groupId ?? undefined,
      terminalId: appliedFilters.terminalId ?? undefined,
      direction: appliedFilters.direction === "all" ? undefined : appliedFilters.direction,
      allowed:
        appliedFilters.allowed === "all"
          ? undefined
          : appliedFilters.allowed === "allowed",
      userTagUid: parsedTagUid ?? undefined,
      fromTime: toUtcIso(appliedFilters.fromTime),
      toTime: toUtcIso(appliedFilters.toTime),
      limit,
      offset,
    };
  }, [appliedFilters, currentNode.id]);

  const { data: logs, isLoading } = useListEntryScanLogsQuery(queryArgs);
  const [exportLogs] = useLazyExportEntryScanLogsQuery();

  const handleApply = () => {
    if (tagUidError) {
      return;
    }
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleExport = async () => {
    try {
      const data = await exportLogs(queryArgs).unwrap();
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `entry_logs_${currentNode.id}.csv`);
      link.click();
      link.remove();
    } catch {
      toast.error(t("entry.logsExportFailed"));
    }
  };

  const columns: GridColDef<EntryScanLog>[] = [
    {
      field: "scanned_at",
      headerName: t("entry.scannedAt"),
      flex: 1.2,
      valueGetter: (value) => formatUtc(value as string),
    },
    {
      field: "terminal_name",
      headerName: t("terminal.terminal"),
      flex: 1,
    },
    {
      field: "area_name",
      headerName: t("entry.area"),
      flex: 1,
    },
    {
      field: "group_name",
      headerName: t("entry.group"),
      flex: 1,
      valueGetter: (value) => value ?? "",
    },
    {
      field: "direction",
      headerName: t("entry.directionLabel"),
      flex: 0.6,
      valueGetter: (value) => {
        const direction = String(value ?? "");
        return t(`entry.direction.${direction}` as any);
      },
    },
    {
      field: "allowed",
      headerName: t("entry.allowed"),
      flex: 0.5,
      valueGetter: (value) => (value ? t("common.yes") : t("common.no")),
    },
    {
      field: "user_tag_uid",
      headerName: t("userTag.uid"),
      flex: 1,
      renderCell: (params) => {
        const uid = formatUid(params.row.user_tag_uid);
        if (params.row.user_tag_id == null) {
          return uid;
        }
        return (
          <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
            {uid}
          </Link>
        );
      },
    },
    {
      field: "reason",
      headerName: t("entry.reason"),
      flex: 1,
    },
  ];

  return (
    <ListLayout
      title={t("entry.logs")}
      additionalActions={[{ label: t("entry.logsExport"), onClick: handleExport, icon: <FileDownloadIcon /> }]}
    >
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("entry.filters")}
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Select
              multiple={false}
              options={entryAreas}
              formatOption={(area) => area.name}
              value={entryAreas.find((area) => area.id === filters.areaId) ?? null}
              label={t("entry.area")}
              onChange={(area) => setFilters((prev) => ({ ...prev, areaId: area?.id ?? null }))}
            />
            <Select
              multiple={false}
              options={entryGroups}
              formatOption={(group) => group.name}
              value={entryGroups.find((group) => group.id === filters.groupId) ?? null}
              label={t("entry.group")}
              onChange={(group) => setFilters((prev) => ({ ...prev, groupId: group?.id ?? null }))}
            />
            <Select
              multiple={false}
              options={terminals}
              formatOption={(terminal) => terminal.name}
              value={terminals.find((terminal) => terminal.id === filters.terminalId) ?? null}
              label={t("terminal.terminal")}
              onChange={(terminal) => setFilters((prev) => ({ ...prev, terminalId: terminal?.id ?? null }))}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label={t("entry.directionLabel")}
              value={filters.direction}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, direction: event.target.value as DirectionFilter }))
              }
            >
              <MenuItem value="all">{t("common.all")}</MenuItem>
              <MenuItem value="entry">{t("entry.direction.entry")}</MenuItem>
              <MenuItem value="exit">{t("entry.direction.exit")}</MenuItem>
            </TextField>
            <TextField
              select
              label={t("entry.allowed")}
              value={filters.allowed}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, allowed: event.target.value as AllowedFilter }))
              }
            >
              <MenuItem value="all">{t("common.all")}</MenuItem>
              <MenuItem value="allowed">{t("entry.allowedYes")}</MenuItem>
              <MenuItem value="denied">{t("entry.allowedNo")}</MenuItem>
            </TextField>
            <TextField
              label={t("entry.tagUid")}
              value={filters.tagUid}
              onChange={(event) => setFilters((prev) => ({ ...prev, tagUid: event.target.value }))}
              error={tagUidError}
              helperText={tagUidError ? t("entry.memberUidInvalid") : " "}
            />
          </Stack>
          <Typography variant="body2">{t("entry.timezoneHint")}</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label={t("entry.fromTime")}
              type="datetime-local"
              value={filters.fromTime}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromTime: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("entry.toTime")}
              type="datetime-local"
              value={filters.toTime}
              onChange={(event) => setFilters((prev) => ({ ...prev, toTime: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("entry.limit")}
              type="number"
              value={filters.limit}
              inputProps={{ min: 1 }}
              onChange={(event) => setFilters((prev) => ({ ...prev, limit: event.target.value }))}
            />
            <TextField
              label={t("entry.offset")}
              type="number"
              value={filters.offset}
              inputProps={{ min: 0 }}
              onChange={(event) => setFilters((prev) => ({ ...prev, offset: event.target.value }))}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button variant="contained" onClick={handleApply} disabled={tagUidError}>
                {t("entry.applyFilters")}
              </Button>
              <Button variant="outlined" onClick={handleReset}>
                {t("entry.resetFilters")}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
      <DataGrid
        autoHeight
        rows={logs ?? []}
        columns={columns}
        disableRowSelectionOnClick
        loading={isLoading}
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
