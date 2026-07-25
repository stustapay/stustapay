import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TerminalRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getTerminalCollection, getUserCollection } from "@/db/collections";
import {
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";

export const UserList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageUsers = useCurrentUserHasPrivilege(UserRoutes.privilege);
  const canManageUsersAtNode = useCurrentUserHasPrivilegeAtNode(UserRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: users, isLoading } = useLiveQuery(
    (q) => q.from({ users: getUserCollection(currentNode.id) }),
    [currentNode.id],
  );
  const { data: terminals, isLoading: isTerminalsLoading } = useLiveQuery(
    (q) => q.from({ terminals: getTerminalCollection(currentNode.id) }),
    [currentNode.id],
  );
  const { dataGridNodeColumn } = useRenderNode();

  const getTerminalName = (id: number) => {
    const terminal = terminals?.find((t) => t.id === id);
    return terminal?.name ?? String(id);
  };

  const renderTerminals = (ids: number[]) => {
    if (ids.length === 0) {
      return "";
    }
    if (!terminals) {
      return "";
    }

    const terminalIds = ids.toSorted((lhs, rhs) =>
      getTerminalName(lhs).toLowerCase().localeCompare(getTerminalName(rhs).toLowerCase()),
    );

    return (
      <div>
        {terminalIds.map((id, index) => {
          const terminal = terminals?.find((t) => t.id === id);
          if (!terminal) {
            return null;
          }
          return (
            <React.Fragment key={id}>
              {index > 0 ? ", " : null}
              <Link
                component={RouterLink}
                to={TerminalRoutes.detail(terminal.id, terminal.node_id)}
              >
                {terminal.name}
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const openConfirmDeleteDialog = (userId: number) => {
    openModal({
      type: "confirm",
      title: t("deleteUser"),
      content: t("deleteUserDescription"),
      onConfirm: () => {
        getUserCollection(currentNode.id).delete(userId);
      },
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof users>>>[] = [
    {
      field: "login",
      headerName: t("userLogin"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={UserRoutes.detail(params.row.id, params.row.node_id)}>
          {params.row.login}
        </Link>
      ),
    },
    {
      field: "display_name",
      headerName: t("userDisplayName"),
      flex: 1,
    },
    {
      field: "terminal_ids",
      headerName: t("user.terminal"),
      flex: 2,
      valueGetter: (_, row) =>
        row.terminal_ids.length === 0
          ? t("user.notLoggedInAtTerminal")
          : row.terminal_ids
              .map(getTerminalName)
              .toSorted((lhs, rhs) => lhs.toLowerCase().localeCompare(rhs.toLowerCase()))
              .join(", "),
      renderCell: (params) => renderTerminals(params.row.terminal_ids),
    },
    {
      field: "user_tag_id",
      headerName: t("user.tagId"),
      width: 100,
      renderCell: (params) =>
        params.row.user_tag_id && (
          <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
            {params.row.user_tag_id}
          </Link>
        ),
    },
    dataGridNodeColumn,
  ];

  if (canManageUsers) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageUsersAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(UserRoutes.edit(params.row.id, params.row.node_id))}
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
    <ListLayout title={t("users")} routes={UserRoutes}>
      <DataGrid
        autoHeight
        loading={isLoading || isTerminalsLoading}
        rows={users ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
