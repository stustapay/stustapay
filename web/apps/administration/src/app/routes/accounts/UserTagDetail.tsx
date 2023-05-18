import { useGetUserTagDetailQuery, useUpdateUserTagCommentMutation } from "@api";
import { EditableListItem, ListItemLink } from "@components";
import { Stack, Paper, ListItem, ListItemText, List } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle, Loading } from "@stustapay/components";
import { formatUserTagUid, UserTagDetail as UserTagDetailType } from "@stustapay/models";
import { ArrayElement, formatDate } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";

type History = UserTagDetailType["account_history"];
type HistoryEntry = ArrayElement<History>;

export const UserTagDetail: React.FC = () => {
  const { t } = useTranslation();
  const { userTagUidHex } = useParams();
  const navigate = useNavigate();

  const [updateComment] = useUpdateUserTagCommentMutation();
  const { data, error, isLoading } = useGetUserTagDetailQuery(userTagUidHex as string);

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
        <RouterLink to={`/customer-accounts/${params.row.account_id}`}>{params.row.account_id}</RouterLink>
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
    updateComment({ userTagUidHex: userTagUidHex as string, comment: newComment });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={formatUserTagUid(data.user_tag_uid_hex)} />
        </ListItem>
      </Paper>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("userTag.uid")} secondary={formatUserTagUid(data.user_tag_uid_hex)} />
          </ListItem>
          <EditableListItem label={t("userTag.comment")} value={data.comment ?? ""} onChange={handleUpdateComment} />
          {data.account_id ? (
            <ListItemLink to={`/customer-accounts/${data.account_id}`}>
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
    </Stack>
  );
};
