import { useGetUserTagDetailQuery, useUpdateUserTagCommentMutation } from "@/api";
import { CustomerRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView, EditableListItem } from "@/components";
import { useCurrentNode } from "@/hooks";
import { DataGrid, GridColDef } from "@stustapay/components";
import { DataGridTitle, Loading } from "@stustapay/components";
import { UserTagDetail as UserTagDetailType, formatUserTagUid } from "@stustapay/models";
import { ArrayElement } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

type History = UserTagDetailType["account_history"];
type HistoryEntry = ArrayElement<History>;

export const UserTagDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userTagId } = useParams();
  const navigate = useNavigate();

  const [updateComment] = useUpdateUserTagCommentMutation();
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
      headerName: t("account.history.account") as string,
      renderCell: (params) => (
        <RouterLink to={CustomerRoutes.detail(params.row.account_id)}>{params.row.account_id}</RouterLink>
      ),
      width: 100,
    },
    {
      field: "mapping_was_valid_until",
      headerName: t("account.history.validUntil") as string,
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

  return (
    <DetailLayout title={t("userTag.userTag")} routes={UserTagRoutes}>
      <DetailView>
        <DetailField label={t("userTag.pin")} value={data.pin} />
        <DetailField label={t("userTag.uid")} value={formatUserTagUid(data.uid_hex)} />
        <EditableListItem label={t("userTag.comment")} value={data.comment ?? ""} onChange={handleUpdateComment} />
        {data.account_id != null ? (
          <DetailField
            label={t("userTag.account")}
            value={data.account_id}
            linkTo={CustomerRoutes.detail(data.account_id)}
          />
        ) : (
          <DetailField label={t("userTag.noAccount")} />
        )}
        {data.user_id != null ? (
          <DetailField label={t("userTag.user")} value={data.user_id} linkTo={UserRoutes.detail(data.user_id)} />
        ) : (
          <DetailField label={t("userTag.noUser")} />
        )}
      </DetailView>
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
