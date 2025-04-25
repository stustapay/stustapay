import {
  AuditLog,
  Terminal,
  selectTerminalAll,
  selectTillById,
  selectUserById,
  useDeleteTerminalMutation,
  useGetAuditLogQuery,
  useListAuditLogsQuery,
  useListTerminalsQuery,
  useListTillsQuery,
  useListUsersQuery,
} from "@/api";
import { TerminalRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView, ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link, ListItem, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { getUserName } from "@stustapay/models";

export const AuditLogDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { auditLogId } = useParams();

  const { data: auditLog } = useGetAuditLogQuery({
    nodeId: currentNode.id,
    auditLogId: Number(auditLogId),
  });
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });
  const { dataGridNodeColumn } = useRenderNode();

  if (!auditLog || !users) {
    return <Loading />;
  }
  const renderUser = (id: number | null) => {
    if (!id || !users) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  return (
    <DetailLayout title={t("auditLog.auditLogs")}>
      <DetailView>
        <DetailField label={t("common.id")} value={auditLog.id} />
        <DetailField label={t("auditLog.logType")} value={auditLog.log_type} />
        <DetailField label={t("common.createdAt")} value={auditLog.created_at} />
        <DetailField
          label={t("auditLog.originatingUser")}
          linkTo={UserRoutes.detail(auditLog.originating_user_id)}
          value={renderUser(auditLog.originating_user_id)}
        />

        {auditLog.content && (
          <ListItem>
            <pre>{JSON.stringify(auditLog.content, null, 2)}</pre>
          </ListItem>
        )}
      </DetailView>
    </DetailLayout>
  );
};
