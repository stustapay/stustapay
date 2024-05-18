import {
  selectUserById,
  selectUserRoleById,
  useListUsersQuery,
  useListUserRolesQuery,
  useListUserToRoleQuery,
  UserToRoles,
  useUpdateUserToRolesMutation,
} from "@/api";
import { UserRoleRoutes, UserRoutes, UserToRoleRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const UserToRoleList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(UserToRoleRoutes.privilege);

  const { data: userToRoles, isLoading } = useListUserToRoleQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: userRoles, isLoading: isUserRolesLoading } = useListUserRolesQuery({ nodeId: currentNode.id });
  const [updateUserToRoles] = useUpdateUserToRolesMutation();
  const renderNode = useRenderNode();
  const openModal = useOpenModal();
  const navigate = useNavigate();

  if (isLoading || isUsersLoading || isUserRolesLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userToRoles: UserToRoles) => {
    if (userToRoles.node_id !== currentNode.id) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("userToRole.deleteAssociation"),
      content: t("userToRole.deleteAssociationDescription"),
      onConfirm: () => {
        updateUserToRoles({
          nodeId: currentNode.id,
          newUserToRoles: { user_id: userToRoles.user_id, role_ids: [] },
        })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const userNameAsString = (id: number) => {
    if (!users) {
      return "";
    }
    const user = selectUserById(users, id);
    return getUserName(user);
  };

  const renderUser = (id: number) => {
    if (!users) {
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

  const renderRoles = (ids: number[]) => {
    if (!userRoles) {
      return "";
    }
    const roles = ids.map((id) => selectUserRoleById(userRoles, id));

    return roles.map(
      (role) =>
        role != null && (
          <Link key={role.id} component={RouterLink} to={UserRoleRoutes.detail(role.id)}>
            {role.name}
          </Link>
        )
    );
  };

  const columns: GridColDef<UserToRoles>[] = [
    {
      field: "user_id",
      headerName: t("userToRole.user") as string,
      flex: 1,
      valueGetter: (params) => userNameAsString(params.row.user_id),
      renderCell: (params) => renderUser(params.row.user_id),
    },
    {
      field: "role_ids",
      headerName: t("userToRole.role") as string,
      flex: 1,
      renderCell: (params) => renderRoles(params.row.role_ids),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: ({ value }) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageNode) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) =>
        currentNode.id === params.row.node_id
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(UserToRoleRoutes.edit(params.row.user_id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="error"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("userToRoles")} routes={UserToRoleRoutes}>
      <DataGrid
        autoHeight
        getRowId={(row) => `${row.node_id}-${row.user_id}`}
        rows={userToRoles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        initialState={{
          sorting: {
            sortModel: [{ field: "user_id", sort: "asc" }],
          },
        }}
      />
    </ListLayout>
  );
};
