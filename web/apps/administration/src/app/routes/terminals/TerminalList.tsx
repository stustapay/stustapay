import {
  Terminal,
  selectTerminalAll,
  selectTillById,
  selectUserById,
  useDeleteTerminalMutation,
  useListTerminalsQuery,
  useListTillsQuery,
  useListUsersQuery,
} from "@/api";
import { TerminalRoutes, TillRoutes, UserRoutes } from "@/app/routes";
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
import { getUserName } from "@stustapay/models";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTerminals = useCurrentUserHasPrivilege(TerminalRoutes.privilege);
  const canManageTerminalsAtNode = useCurrentUserHasPrivilegeAtNode(TerminalRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data) : undefined,
      }),
    }
  );
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const [deleteTerminal] = useDeleteTerminalMutation();
  const { dataGridNodeColumn } = useRenderNode();

  if (isTerminalsLoading || isTillsLoading || isUsersLoading) {
    return <Loading />;
  }

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillRoutes.detail(till.id, till.node_id)}>
        {till.name}
      </Link>
    );
  };

  const renderUser = (id?: number | null) => {
    if (!id || !users) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        deleteTerminal({ nodeId: currentNode.id, terminalId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const columns: GridColDef<Terminal>[] = [
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
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={UserRoutes.detail(row.active_user_id)}>
          {renderUser(row.active_user_id)}
        </Link>
      ),
    },
    {
      field: "till_id",
      headerName: t("terminal.till"),
      flex: 0.5,
      renderCell: (params) => renderTill(params.row.till_id),
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
        rows={terminals ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
