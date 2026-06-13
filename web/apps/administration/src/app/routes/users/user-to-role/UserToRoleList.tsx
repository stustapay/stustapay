import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

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

export const UserToRoleList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(UserToRoleRoutes.privilege);

  const { data: userToRoles, isLoading } = useListUserToRoleQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: userRoles, isLoading: isUserRolesLoading } = useListUserRolesQuery({
    nodeId: currentNode.id,
  });
  const [updateUserToRoles] = useUpdateUserToRolesMutation();
  const { dataGridNodeColumn } = useRenderNode();
  const openModal = useOpenModal();
  const navigate = useNavigate();

  const getUserDisplayName = (userId: number) => {
    const user = users ? selectUserById(users, userId) : undefined;
    return user ? getUserName(user) : String(userId);
  };

  const getRoleNames = (roleIds: number[]) => {
    if (!userRoles) {
      return "";
    }
    return roleIds
      .map((id) => selectUserRoleById(userRoles, id)?.name)
      .filter((name): name is string => name != null)
      .toSorted((lhs, rhs) => lhs.toLowerCase().localeCompare(rhs.toLowerCase()))
      .join(", ");
  };

  const openConfirmDeleteDialog = (userToRole: UserToRoles) => {
    if (userToRole.node_id !== currentNode.id) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("userToRole.deleteAssociation"),
      content: t("userToRole.deleteAssociationDescription", {
        userName: getUserDisplayName(userToRole.user_id),
        nodeName: currentNode.name,
        roles: getRoleNames(userToRole.role_ids),
      }),
      onConfirm: () => {
        updateUserToRoles({
          nodeId: currentNode.id,
          newUserToRoles: { user_id: userToRole.user_id, role_ids: [] },
        })
          .unwrap()
          .catch(() => undefined);
      },
    });
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
      <Link component={RouterLink} to={UserRoutes.detail(id, user.node_id)}>
        {getUserName(user)}
      </Link>
    );
  };

  const renderRoles = (ids: number[]) => {
    if (!userRoles) {
      return "";
    }
    const roles = ids
      .map((id) => selectUserRoleById(userRoles, id))
      .filter((role) => role != null)
      .toSorted((lhs, rhs) => lhs.name.toLowerCase().localeCompare(rhs.name.toLowerCase()));

    return (
      <div>
        {roles.map((role, index) => (
          <React.Fragment key={role.id}>
            {index > 0 ? ", " : null}
            <Link component={RouterLink} to={UserRoleRoutes.detail(role.id, role.node_id)}>
              {role.name}
            </Link>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const columns: GridColDef<UserToRoles>[] = [
    {
      field: "user_id",
      headerName: t("userToRole.user"),
      flex: 1,
      renderCell: (params) => renderUser(params.row.user_id),
    },
    {
      field: "role_ids",
      headerName: t("userToRole.role"),
      flex: 1,
      renderCell: (params) => renderRoles(params.row.role_ids),
    },
    dataGridNodeColumn,
  ];

  if (canManageNode) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
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
                icon={<DeleteIcon color="error" />}
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
        loading={isLoading || isUsersLoading || isUserRolesLoading}
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
