import {
  EntryAreaGroupWindow,
  EntryAreaGroupWithGroup,
  EntryGroup,
  useAssignEntryGroupToAreaMutation,
  useCreateEntryAreaGroupWindowMutation,
  useDeleteEntryAreaGroupWindowMutation,
  useGetEntryAreaQuery,
  useListEntryAreaGroupWindowsQuery,
  useListEntryAreaGroupsQuery,
  useListEntryGroupsQuery,
  useRemoveEntryGroupFromAreaMutation,
} from "@/api";
import { EntryAreaRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components/layouts";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Select } from "@stustapay/components";
import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const toIso = (value: string) => (value ? new Date(`${value}Z`).toISOString() : "");
const formatUtc = (value: string) => new Date(value).toLocaleString(undefined, { timeZone: "UTC" });

export const EntryAreaDetail: React.FC = () => {
  const { t } = useTranslation();
  const { entryAreaId } = useParams();
  const { currentNode } = useCurrentNode();
  const areaId = Number(entryAreaId);

  const { data: area, isLoading: areaLoading, error: areaError } = useGetEntryAreaQuery({
    nodeId: currentNode.id,
    areaId,
  });
  const { data: groups, isLoading: groupsLoading } = useListEntryGroupsQuery({ nodeId: currentNode.id });
  const { data: areaGroups, isLoading: areaGroupsLoading } = useListEntryAreaGroupsQuery({
    nodeId: currentNode.id,
    areaId,
  });

  const [assignGroup] = useAssignEntryGroupToAreaMutation();
  const [removeGroup] = useRemoveEntryGroupFromAreaMutation();
  const [createWindow] = useCreateEntryAreaGroupWindowMutation();
  const [deleteWindow] = useDeleteEntryAreaGroupWindowMutation();

  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [newGroup, setNewGroup] = React.useState<EntryGroup | null>(null);
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");

  const { data: windows } = useListEntryAreaGroupWindowsQuery(
    {
      nodeId: currentNode.id,
      areaId,
      groupId: selectedGroupId ?? 0,
    },
    { skip: selectedGroupId == null }
  );

  React.useEffect(() => {
    if (selectedGroupId == null && areaGroups && areaGroups.length > 0) {
      setSelectedGroupId(areaGroups[0].group_id);
    }
  }, [selectedGroupId, areaGroups]);

  if (areaError) {
    return <Navigate to={EntryAreaRoutes.list()} />;
  }

  if (areaLoading || !area || groupsLoading || areaGroupsLoading || !areaGroups) {
    return <Loading />;
  }

  const assignedGroupIds = new Set(areaGroups.map((group) => group.group_id));
  const availableGroups = groups
    ? groups.ids.map((id) => groups.entities[id]).filter((g): g is EntryGroup => Boolean(g) && !assignedGroupIds.has(g.id))
    : [];

  const groupColumns: GridColDef<EntryAreaGroupWithGroup>[] = [
    {
      field: "group_name",
      headerName: t("entry.group"),
      flex: 1,
      valueGetter: (_, row) => row.group_name,
    },
    {
      field: "group_description",
      headerName: t("common.description"),
      flex: 1,
      valueGetter: (_, row) => row.group_description ?? "",
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="primary"
          label={t("delete")}
          onClick={() =>
            removeGroup({ nodeId: currentNode.id, areaId, groupId: params.row.group_id })
              .unwrap()
              .catch(() => toast.error(t("entry.groupRemoveFailed")))
          }
        />,
      ],
    },
  ];

  const windowColumns: GridColDef<EntryAreaGroupWindow>[] = [
    {
      field: "start_at",
      headerName: t("entry.windowStart"),
      flex: 1,
      valueGetter: (value) => formatUtc(value as string),
    },
    {
      field: "end_at",
      headerName: t("entry.windowEnd"),
      flex: 1,
      valueGetter: (value) => formatUtc(value as string),
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="primary"
          label={t("delete")}
          onClick={() => {
            if (selectedGroupId == null) {
              return;
            }
            deleteWindow({
              nodeId: currentNode.id,
              areaId,
              groupId: selectedGroupId,
              windowId: params.row.id,
            })
              .unwrap()
              .catch(() => toast.error(t("entry.windowRemoveFailed")));
          }}
        />,
      ],
    },
  ];

  const handleAddGroup = () => {
    if (!newGroup) {
      return;
    }
    assignGroup({ nodeId: currentNode.id, areaId, entryAreaGroupAssignPayload: { group_id: newGroup.id } })
      .unwrap()
      .then(() => {
        setNewGroup(null);
      })
      .catch(() => toast.error(t("entry.groupAssignFailed")));
  };

  const handleCreateWindow = () => {
    if (!selectedGroupId) {
      return;
    }
    if (!startAt || !endAt) {
      toast.error(t("entry.windowValidation"));
      return;
    }
    createWindow({
      nodeId: currentNode.id,
      areaId,
      groupId: selectedGroupId,
      newEntryAreaGroupWindow: { start_at: toIso(startAt), end_at: toIso(endAt) },
    })
      .unwrap()
      .then(() => {
        setStartAt("");
        setEndAt("");
      })
      .catch(() => toast.error(t("entry.windowCreateFailed")));
  };

  return (
    <DetailLayout title={area.name} routes={EntryAreaRoutes} elementNodeId={area.node_id}>
      <DetailView>
        <DetailField label={t("common.name")} value={area.name} />
        <DetailField label={t("common.description")} value={area.description} />
      </DetailView>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">{t("entry.groups")}</Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 2 }}>
          <Select
            multiple={false}
            formatOption={(group) => group.name}
            value={newGroup}
            options={availableGroups}
            label={t("entry.group")}
            onChange={(group) => setNewGroup(group)}
          />
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleAddGroup} disabled={!newGroup}>
            {t("entry.assignGroup")}
          </Button>
        </Stack>
        <DataGrid
          autoHeight
          rows={areaGroups}
          columns={groupColumns}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelectedGroupId(params.row.group_id)}
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </Paper>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">{t("entry.windows")}</Typography>
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          {t("entry.timezoneHint")}
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label={t("entry.windowStart")}
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t("entry.windowEnd")}
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleCreateWindow} disabled={!selectedGroupId}>
            {t("entry.addWindow")}
          </Button>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <DataGrid
          autoHeight
          rows={windows ?? []}
          columns={windowColumns}
          disableRowSelectionOnClick
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </Paper>
    </DetailLayout>
  );
};
