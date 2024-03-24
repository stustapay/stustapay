import { useGetUserTagDetailQuery, useUpdateUserTagCommentMutation } from "@/api";
import { CustomerRoutes, UserTagRoutes } from "@/app/routes";
import { DetailLayout, EditableListItem, ListItemLink } from "@/components";
import { useCurrentNode } from "@/hooks";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle, Loading } from "@stustapay/components";
import { UserTagDetail as UserTagDetailType, formatUserTagUid } from "@stustapay/models";
import { ArrayElement, formatDate } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

type History = UserTagDetailType["account_history"];
type HistoryEntry = ArrayElement<History>;

export const UserTagDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userTagUidHex } = useParams();
  const navigate = useNavigate();

  const [updateComment] = useUpdateUserTagCommentMutation();
  const { data, error, isLoading } = useGetUserTagDetailQuery({
    nodeId: currentNode.id,
    userTagUidHex: userTagUidHex as string,
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
      headerName: t("account.history.account") as string,
      renderCell: (params) => (
        <RouterLink to={CustomerRoutes.detail(params.row.account_id)}>{params.row.account_id}</RouterLink>
      ),
      width: 100,
    },
    {
      field: "mapping_was_valid_until",
      headerName: t("account.history.validUntil") as string,
      type: "number",
      valueGetter: ({ value }) => formatDate(value),
      width: 200,
    },
  ];

  const handleUpdateComment = (newComment: string) => {
    updateComment({
      nodeId: currentNode.id,
      userTagUidHex: userTagUidHex as string,
      updateCommentPayload: { comment: newComment },
    });
  };

  return (
    <DetailLayout title={formatUserTagUid(data.user_tag_uid_hex)} routes={UserTagRoutes}>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("userTag.uid")} secondary={formatUserTagUid(data.user_tag_uid_hex)} />
          </ListItem>
          <EditableListItem label={t("userTag.comment")} value={data.comment ?? ""} onChange={handleUpdateComment} />
          {data.account_id ? (
            <ListItemLink to={CustomerRoutes.detail(data.account_id)}>
              <ListItemText primary={t("userTag.account")} secondary={data.account_id} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("userTag.noAccount")} />
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
