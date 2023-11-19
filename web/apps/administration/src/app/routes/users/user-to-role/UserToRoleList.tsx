import {
  selectUserById,
  selectUserRoleById,
  useDeassociatedUserToRoleMutation,
  useListUsersQuery,
  useListUserRolesQuery,
  useListUserToRoleQuery,
  UserToRole,
} from "@/api";
import { UserRoleRoutes, UserRoutes, UserToRoleRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { formatUserTagUid, getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const UserToRoleList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const { data: userToRoles, isLoading } = useListUserToRoleQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: userRoles, isLoading: isUserRolesLoading } = useListUserRolesQuery({ nodeId: currentNode.id });
  const [deleteUserToRole] = useDeassociatedUserToRoleMutation();
  const [userToRoleToDelete, setUserToDelete] = React.useState<UserToRole | null>(null);
  const renderNode = useRenderNode();

  if (isLoading || isUsersLoading || isUserRolesLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userToRole: UserToRole) => {
    setUserToDelete(userToRole);
  };

  const handleConfirmDeleteUserToRole: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && userToRoleToDelete !== null) {
      deleteUserToRole({ nodeId: currentNode.id, newUserToRole: userToRoleToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setUserToDelete(null);
  };

  const renderUser = (id: number) => {
    if (id == null || !users) {
      return "";
    }
    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return (
      <Link component={RouterLink} to={UserRoutes.detail(id)}>
        {getUserName(user)}
      </Link>
    );
  };

  const renderRole = (id: number) => {
    if (id == null || !userRoles) {
      return "";
    }
    const role = selectUserRoleById(userRoles, id);
    if (!role) {
      return "";
    }

    return (
      <Link component={RouterLink} to={UserRoleRoutes.detail(id)}>
        {role.name}
      </Link>
    );
  };

  const columns: GridColDef<UserToRole>[] = [
    {
      field: "user_id",
      headerName: t("userToRole.user") as string,
      flex: 1,
      renderCell: (params) => renderUser(params.row.user_id),
    },
    {
      field: "role_id",
      headerName: t("userToRole.role") as string,
      flex: 1,
      renderCell: (params) => renderRole(params.row.role_id),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: ({ value }) => renderNode(value),
      flex: 1,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row)}
        />,
      ],
    },
  ];

  return (
    <ListLayout title={t("userToRoles")} routes={UserToRoleRoutes}>
      <DataGrid
        autoHeight
        getRowId={(row) => `${row.node_id}-${row.user_id}-${row.role_id}`}
        rows={userToRoles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("userToRole.deleteAssociation")}
        body={t("userToRole.deleteAssociationDescription")}
        show={userToRoleToDelete !== null}
        onClose={handleConfirmDeleteUserToRole}
      />
    </ListLayout>
  );
};
