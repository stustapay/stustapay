import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { eq, materialize, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { AuditLogRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { UserCell, userValueGetter } from "@/components/table/UserCell";
import { getAuditLogCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode, useRenderNode } from "@/hooks";

export const AuditLogList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: rows, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ auditLog: getAuditLogCollection(currentNode.id) })
        .select(({ auditLog: auditLogRow }) => ({
          ...auditLogRow,
          originatingUser: materialize(
            q
              .from({ users: getUserCollection(currentNode.id) })
              .where(({ users }) =>
                auditLogRow.originating_user_id != null
                  ? eq(users.id, auditLogRow.originating_user_id)
                  : eq(users.id, -1),
              )
              .select(({ users }) => users)
              .findOne(),
          ),
        })),
    [currentNode.id],
  );
  const { dataGridNodeColumn } = useRenderNode();

  type AuditLogRow = ArrayElement<NonNullable<typeof rows>>;

  const columns: GridColDef<AuditLogRow>[] = [
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
      minWidth: 250,
    },
    {
      field: "originating_user_id",
      headerName: t("auditLog.originatingUser"),
      flex: 1,
      valueGetter: (_, row) => userValueGetter(row.originatingUser),
      renderCell: ({ row }) => <UserCell user={row.originatingUser} nodeId={row.node_id} />,
    },
    {
      field: "created_at",
      headerName: t("common.createdAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      minWidth: 200,
    },
    dataGridNodeColumn,
  ];

  return (
    <ListLayout title={t("auditLog.auditLogs")}>
      <DataGrid
        loading={isLoading}
        rows={rows ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
