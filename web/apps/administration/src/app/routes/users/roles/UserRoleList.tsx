import { UserRole, selectUserRoleAll, useDeleteUserRoleMutation, useListUserRolesQuery } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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
  const renderNode = useRenderNode();

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
      headerName: t("userRole.name") as string,
      flex: 1,
    },
    {
      field: "is_privileged",
      headerName: t("userRole.isPrivileged") as string,
      type: "boolean",
    },
    {
      field: "privileges",
      headerName: t("userPrivileges") as string,
      flex: 1,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: ({ value }) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageUsers) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
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
                icon={<DeleteIcon />}
                color="error"
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
