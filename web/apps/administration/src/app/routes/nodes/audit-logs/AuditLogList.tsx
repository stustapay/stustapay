import {
  AuditLog,
  Terminal,
  selectTerminalAll,
  selectTillById,
  useDeleteTerminalMutation,
  useListAuditLogsQuery,
  useListTerminalsQuery,
  useListTillsQuery,
} from "@/api";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const AuditLogList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: auditLogs, isLoading } = useListAuditLogsQuery({ nodeId: currentNode.id });
  const { dataGridNodeColumn } = useRenderNode();

  if (isLoading) {
    return <Loading />;
  }

  const columns: GridColDef<AuditLog>[] = [
    {
      field: "id",
      headerName: t("common.id"),
    },
    {
      field: "log_type",
      headerName: t("auditLog.logType"),
      flex: 1,
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
        rows={auditLogs ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
