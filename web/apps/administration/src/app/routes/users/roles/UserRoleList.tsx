import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { Loading } from "@stustapay/components";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link as RouterLink } from "react-router-dom";

import { UserRole, selectUserRoleAll, useDeleteUserRoleMutation, useListUserRolesQuery } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

import { PrivilegeOverviewCell } from "./components/PrivilegeOverviewCell";

export const UserRoleList: React.FC = () => {
  const { t } = useTranslation();
  const canManageUsers = useCurrentUserHasPrivilege(UserRoleRoutes.privilege);
  const canManageUsersAtNode = useCurrentUserHasPrivilegeAtNode(UserRoleRoutes.privilege);
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { userRoles, isLoading } = useListUserRolesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userRoles: data ? selectUserRoleAll(data) : undefined,
      }),
    }
  );
  const [deleteUserRole] = useDeleteUserRoleMutation();
  const { dataGridNodeColumn } = useRenderNode();

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userRoleId: number) => {
    openModal({
      type: "confirm",
      title: t("userRole.delete"),
      content: t("userRole.deleteDescription"),
      onConfirm: () => {
        deleteUserRole({ nodeId: currentNode.id, userRoleId })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const columns: GridColDef<UserRole>[] = [
    {
      field: "name",
      headerName: t("userRole.name"),
      renderCell: (params) => (
        <Link component={RouterLink} to={UserRoleRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
      minWidth: 200,
    },
    {
      field: "can_assign_all_roles",
      headerName: t("userRole.canAssignAllRoles"),
      description: t("userRole.canAssignAllRolesDescription"),
      type: "boolean",
    },
    {
      field: "privileges",
      headerName: t("userRole.privileges"),
      flex: 1,
      sortable: false,
      valueGetter: (_, row) => [...row.event_privileges, ...row.node_privileges].join(", "),
      renderCell: (params) => (
        <PrivilegeOverviewCell
          eventPrivileges={params.row.event_privileges}
          nodePrivileges={params.row.node_privileges}
        />
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
                onClick={() => navigate(UserRoleRoutes.edit(params.row.id))}
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
    <ListLayout title={t("userRoles")} routes={UserRoleRoutes}>
      <DataGrid
        autoHeight
        rows={userRoles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
