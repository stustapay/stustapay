import {
  EntryGroupMember,
  useAddEntryGroupMemberMutation,
  useAddEntryGroupMembersByGroupTagMutation,
  useGetEntryGroupQuery,
  useListEntryGroupMembersQuery,
  useRemoveEntryGroupMemberMutation,
} from "@/api";
import { EntryGroupRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components/layouts";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { formatUserTagUid } from "@stustapay/models";
import { Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

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

export const EntryGroupDetail: React.FC = () => {
  const { t } = useTranslation();
  const { entryGroupId } = useParams();
  const { currentNode } = useCurrentNode();
  const groupId = Number(entryGroupId);

  const { data: group, isLoading: groupLoading, error: groupError } = useGetEntryGroupQuery({
    nodeId: currentNode.id,
    groupId,
  });
  const { data: members, isLoading: membersLoading } = useListEntryGroupMembersQuery({
    nodeId: currentNode.id,
    groupId,
  });
  const [addMember] = useAddEntryGroupMemberMutation();
  const [addMembersByGroupTag] = useAddEntryGroupMembersByGroupTagMutation();
  const [removeMember] = useRemoveEntryGroupMemberMutation();

  const [tagUidInput, setTagUidInput] = React.useState("");
  const [groupTagInput, setGroupTagInput] = React.useState("");

  if (groupError) {
    return <Navigate to={EntryGroupRoutes.list()} />;
  }

  if (groupLoading || membersLoading || !group || !members) {
    return <Loading />;
  }

  const columns: GridColDef<EntryGroupMember>[] = [
    {
      field: "user_tag_pin",
      headerName: t("userTag.pin"),
      flex: 1,
    },
    {
      field: "user_tag_uid",
      headerName: t("userTag.uid"),
      flex: 1,
      valueGetter: (value) => {
        if (value == null) {
          return "";
        }
        const numeric = typeof value === "number" ? value : Number(value);
        if (Number.isNaN(numeric)) {
          return "";
        }
        return formatUserTagUid(numeric.toString(16).toUpperCase());
      },
    },
    {
      field: "comment",
      headerName: t("userTag.comment"),
      flex: 1,
    },
    {
      field: "is_vip",
      headerName: t("userTag.vipStatus"),
      type: "boolean",
      flex: 0.4,
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
            removeMember({ nodeId: currentNode.id, groupId, userTagId: params.row.user_tag_id })
              .unwrap()
              .catch(() => toast.error(t("entry.memberRemoveFailed")))
          }
        />,
      ],
    },
  ];

  const handleAdd = () => {
    const uid = parseTagUid(tagUidInput);
    if (uid == null) {
      toast.error(t("entry.memberUidInvalid"));
      return;
    }
    addMember({ nodeId: currentNode.id, groupId, entryGroupMemberAddPayload: { user_tag_uid: uid } })
      .unwrap()
      .then(() => setTagUidInput(""))
      .catch(() => toast.error(t("entry.memberAddFailed")));
  };

  const handleAddByGroupTag = () => {
    const groupTag = groupTagInput.trim();
    if (!groupTag) {
      toast.error(t("entry.memberGroupTagInvalid"));
      return;
    }
    addMembersByGroupTag({
      nodeId: currentNode.id,
      groupId,
      entryGroupMemberAddByGroupTagPayload: { group_tag: groupTag },
    })
      .unwrap()
      .then((added) => {
        toast.success(t("entry.memberGroupTagAdded", { count: added.length }));
        setGroupTagInput("");
      })
      .catch(() => toast.error(t("entry.memberAddFailed")));
  };

  return (
    <DetailLayout title={group.name} routes={EntryGroupRoutes} elementNodeId={group.node_id}>
      <DetailView>
        <DetailField label={t("common.name")} value={group.name} />
        <DetailField label={t("common.description")} value={group.description} />
      </DetailView>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">{t("entry.members")}</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2, mb: 2 }}>
          <TextField
            label={t("entry.memberUid")}
            value={tagUidInput}
            onChange={(event) => setTagUidInput(event.target.value)}
            placeholder={t("entry.memberUidPlaceholder")}
          />
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleAdd}>
            {t("entry.addMember")}
          </Button>
          <TextField
            label={t("entry.memberGroupTag")}
            value={groupTagInput}
            onChange={(event) => setGroupTagInput(event.target.value)}
            placeholder={t("entry.memberGroupTagPlaceholder")}
          />
          <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddByGroupTag}>
            {t("entry.addMemberGroupTag")}
          </Button>
        </Stack>
        <DataGrid
          autoHeight
          rows={members ?? []}
          columns={columns}
          getRowId={(row) => row.user_tag_id}
          disableRowSelectionOnClick
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </Paper>
    </DetailLayout>
  );
};
