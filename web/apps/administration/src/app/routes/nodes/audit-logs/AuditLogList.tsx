import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { AuditLog, selectUserById, useListAuditLogsQuery, useListUsersQuery } from "@/api";
import { AuditLogRoutes, UserRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useRenderNode } from "@/hooks";

export const AuditLogList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: auditLogs, isLoading } = useListAuditLogsQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { dataGridNodeColumn } = useRenderNode();

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

  const columns: GridColDef<AuditLog>[] = [
    {
      field: "id",
      headerName: t("common.id"),
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={AuditLogRoutes.detail(row.id)}>
          {row.id}
        </Link>
      ),
    },
    {
      field: "log_type",
      headerName: t("auditLog.logType"),
      flex: 1,
    },
    {
      field: "originating_user_id",
      headerName: t("auditLog.originatingUser"),
      flex: 1,
      valueGetter: (value) => renderUser(value),
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={UserRoutes.detail(row.originating_user_id)}>
          {renderUser(row.originating_user_id)}
        </Link>
      ),
    },
    {
      field: "created_at",
      headerName: t("common.createdAt"),
      type: "dateTime",
      valueGetter: (val) => new Date(val),
      minWidth: 200,
    },
    dataGridNodeColumn,
  ];

  return (
    <ListLayout title={t("auditLog.auditLogs")}>
      <DataGrid
        loading={isLoading || isUsersLoading}
        rows={auditLogs ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
