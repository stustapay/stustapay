import { useGetUserTagDetailQuery, useUpdateUserTagCommentMutation, useUpdateUserTagVipStatusMutation } from "@/api";
import { CustomerRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView, EditableListItem } from "@/components";
import { ListItemLink } from "@/components/ListItemLink";
import { useCurrentNode } from "@/hooks";
import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { UserTagDetail as UserTagDetailType, formatUserTagUid } from "@stustapay/models";
import { ArrayElement } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { List, ListItem, ListItemText, Paper, FormControlLabel, Switch } from "@mui/material";

type History = UserTagDetailType["account_history"];
type HistoryEntry = ArrayElement<History>;

export const UserTagDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userTagId } = useParams();
  const navigate = useNavigate();

  const [updateComment] = useUpdateUserTagCommentMutation();
  const [updateVipStatus] = useUpdateUserTagVipStatusMutation();
  const { data, error, isLoading } = useGetUserTagDetailQuery({
    nodeId: currentNode.id,
    userTagId: Number(userTagId),
  });

  if (isLoading || (!data && !error)) {
    return <Loading />;
  }

  if (error || !data) {
    toast.error("Error loading user tag detail");
    navigate(-1);
    return null;
  }

  const columns: GridColDef<HistoryEntry>[] = [
    {
      field: "account_id",
      headerName: t("account.history.account"),
      renderCell: (params) => (
        <RouterLink to={CustomerRoutes.detail(params.row.account_id)}>{params.row.account_id}</RouterLink>
      ),
      width: 100,
    },
    {
      field: "mapping_was_valid_until",
      headerName: t("account.history.validUntil"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      width: 200,
    },
  ];

  const handleUpdateComment = (newComment: string) => {
    updateComment({
      nodeId: currentNode.id,
      userTagId: Number(userTagId),
      updateCommentPayload: { comment: newComment },
    });
  };

  const handleUpdateVipStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVipStatus = e.target.checked;
    updateVipStatus({
      nodeId: currentNode.id,
      userTagId: Number(userTagId),
      updateVipStatusPayload: { is_vip: newVipStatus },
    })
      .unwrap()
      .then(() => {
        toast.success(newVipStatus ? t("userTag.vipStatusEnabled") : t("userTag.vipStatusDisabled"));
      })
      .catch(() => {
        toast.error(t("userTag.vipStatusUpdateFailed"));
      });
  };

  return (
    <DetailLayout title={t("userTag.userTag")} routes={UserTagRoutes}>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("userTag.pin")} secondary={data.pin} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("userTag.uid")} secondary={formatUserTagUid(data.uid?.toString(16).toUpperCase())} />
          </ListItem>
          <EditableListItem label={t("userTag.comment")} value={data.comment ?? ""} onChange={handleUpdateComment} />
          <ListItem>
            <FormControlLabel
              control={<Switch checked={Boolean(data.is_vip)} onChange={handleUpdateVipStatus} />}
              label={t("userTag.vipStatus") || "VIP Status"}
            />
          </ListItem>
          {data.account_id != null ? (
            <ListItemLink to={CustomerRoutes.detail(data.account_id)}>
              <ListItemText primary={t("userTag.account")} secondary={data.account_id} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("userTag.noAccount")} />
            </ListItem>
          )}
          {data.user_id != null ? (
            <ListItemLink to={UserRoutes.detail(data.user_id)}>
              <ListItemText primary={t("userTag.user")} secondary={data.user_id} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("userTag.noUser")} />
            </ListItem>
          )}
        </List>
      </Paper>
      <DataGrid
        autoHeight
        slots={{ toolbar: () => <DataGridTitle title={t("userTag.accountHistory")} /> }}
        getRowId={(row) => row.account_id}
        rows={data.account_history}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </DetailLayout>
  );
};
