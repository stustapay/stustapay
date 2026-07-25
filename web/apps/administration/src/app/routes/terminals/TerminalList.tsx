import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { eq, materialize, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getTerminalCollection, getTillCollection, getUserCollection } from "@/db/collections";
import {
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";
import { UserCell, userValueGetter } from "@/components/table/UserCell";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTerminals = useCurrentUserHasPrivilege(TerminalRoutes.privilege);
  const canManageTerminalsAtNode = useCurrentUserHasPrivilegeAtNode(TerminalRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: terminals, isLoading: isTerminalsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ terminals: getTerminalCollection(currentNode.id) })
        .join(
          { tills: getTillCollection(currentNode.id) },
          ({ tills, terminals }) => eq(terminals.till_id, tills.id),
          "left" as const,
        )
        .select(({ terminals: terminalRow, tills }) => ({
          ...terminalRow,
          till: tills,
          user: materialize(
            q
              .from({ users: getUserCollection(currentNode.id) })
              .where(({ users }) =>
                terminalRow.active_user_id != null
                  ? eq(users.id, terminalRow.active_user_id)
                  : eq(users.id, -1),
              )
              .select(({ users }) => users)
              .findOne(),
          ),
        })),
    [currentNode.id],
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (terminalId: number) => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        getTerminalCollection(currentNode.id).delete(terminalId);
        return true;
      },
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof terminals>>>[] = [
    {
      field: "name",
      headerName: t("common.name"),
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.description}>
          <Link component={RouterLink} to={TerminalRoutes.detail(params.row.id)}>
            {params.row.name}
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "active_user_id",
      headerName: t("till.activeUser"),
      flex: 1,
      valueGetter: (_, row) => userValueGetter(row.user),
      renderCell: ({ row }) => <UserCell user={row.user} nodeId={row.node_id} />,
    },
    {
      field: "till_id",
      headerName: t("terminal.till"),
      flex: 0.5,
      renderCell: (params) =>
        params.row.till ? (
          <Link
            component={RouterLink}
            to={TillRoutes.detail(params.row.till.id, params.row.till.node_id)}
          >
            {params.row.till.name}
          </Link>
        ) : null,
    },
    {
      field: "last_seen",
      headerName: t("terminal.lastSeen"),
      type: "dateTime",
      valueGetter: (val) => new Date(val),
      minWidth: 200,
    },
    {
      field: "session_uuid",
      headerName: t("terminal.loggedIn"),
      type: "boolean",
      valueGetter: (session_uuid) => session_uuid != null,
    },
    dataGridNodeColumn,
  ];

  if (canManageTerminals) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageTerminalsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TerminalRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("terminal.terminals")} routes={TerminalRoutes}>
      <DataGrid
        loading={isTerminalsLoading}
        rows={terminals ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
