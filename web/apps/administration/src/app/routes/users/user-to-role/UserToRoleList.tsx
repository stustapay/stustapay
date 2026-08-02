import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import { ArrayElement } from "@stustapay/utils";
import { eq, materialize, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { UserRoleRoutes, UserToRoleRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { UserCell, userValueGetter } from "@/components/table/UserCell";
import { getUserCollection, getUserRoleCollection, getUserToRoleCollection, getUserToRoleKey } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";

export const UserToRoleList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(UserToRoleRoutes.privilege);

  const { data: userToRoles, isLoading } = useLiveQuery(
    (q) =>
      q.from({ userToRole: getUserToRoleCollection(currentNode.id) }).select(({ userToRole }) => ({
        ...userToRole,
        user: materialize(
          q
            .from({ users: getUserCollection(currentNode.id) })
            .where(({ users }) => eq(users.id, userToRole.user_id))
            .select(({ users }) => users)
            .findOne()
        ),
      })),
    [currentNode.id]
  );
  const { data: userRoles, isLoading: isUserRolesLoading } = useLiveQuery(
    (q) => q.from({ userRoles: getUserRoleCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();
  const openModal = useOpenModal();
  const navigate = useNavigate();

  type UserToRoleRow = ArrayElement<NonNullable<typeof userToRoles>>;

  const roleById = React.useMemo(() => new Map(userRoles?.map((role) => [role.id, role])), [userRoles]);

  const getRoleNames = (roleIds: number[]) => {
    return roleIds
      .map((id) => roleById.get(id)?.name)
      .filter((name): name is string => name != null)
      .toSorted((lhs, rhs) => lhs.toLowerCase().localeCompare(rhs.toLowerCase()))
      .join(", ");
  };

  const openConfirmDeleteDialog = (row: UserToRoleRow) => {
    if (row.node_id !== currentNode.id) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("userToRole.deleteAssociation"),
      content: t("userToRole.deleteAssociationDescription", {
        userName: getUserName(row.user),
        nodeName: currentNode.name,
        roles: getRoleNames(row.role_ids),
      }),
      onConfirm: () => {
        getUserToRoleCollection(currentNode.id).delete(getUserToRoleKey(row.node_id, row.user_id));
      },
    });
  };

  const renderRoles = (ids: number[]) => {
    const roles = ids
      .map((id) => roleById.get(id))
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

  const columns: GridColDef<UserToRoleRow>[] = [
    {
      field: "user_id",
      headerName: t("userToRole.user"),
      flex: 1,
      valueGetter: (_, row) => userValueGetter(row.user),
      renderCell: ({ row }) => <UserCell user={row.user} nodeId={row.node_id} />,
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
        loading={isLoading || isUserRolesLoading}
        getRowId={(row) => getUserToRoleKey(row.node_id, row.user_id)}
        rows={userToRoles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
        initialState={{
          sorting: {
            sortModel: [{ field: "user_id", sort: "asc" }],
          },
        }}
      />
    </ListLayout>
  );
};
