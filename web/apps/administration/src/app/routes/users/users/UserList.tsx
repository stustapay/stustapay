import { selectUserAll, useDeleteUserMutation, useListUsersQuery, User } from "@/api";
import { UserRoutes, UserTagRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const UserList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageUsers = useCurrentUserHasPrivilege(UserRoutes.privilege);
  const canManageUsersAtNode = useCurrentUserHasPrivilegeAtNode(UserRoutes.privilege);
  const navigate = useNavigate();

  const { users, isLoading } = useListUsersQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        users: data ? selectUserAll(data) : undefined,
      }),
    }
  );
  const [deleteUser] = useDeleteUserMutation();
  const [userToDelete, setUserToDelete] = React.useState<number | null>(null);
  const renderNode = useRenderNode();

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userId: number) => {
    setUserToDelete(userId);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && userToDelete !== null) {
      deleteUser({ nodeId: currentNode.id, userId: userToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setUserToDelete(null);
  };

  const columns: GridColDef<User>[] = [
    {
      field: "login",
      headerName: t("userLogin") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={UserRoutes.detail(params.row.id)}>
          {params.row.login}
        </Link>
      ),
    },
    {
      field: "display_name",
      headerName: t("userDisplayName") as string,
      flex: 1,
    },
    {
      field: "description",
      headerName: t("userDescription") as string,
      flex: 2,
    },
    {
      field: "user_tag_id",
      headerName: t("user.tagId") as string,
      width: 100,
      renderCell: (params) =>
        params.row.user_tag_id && (
          <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
            {params.row.user_tag_id}
          </Link>
        ),
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
                onClick={() => navigate(UserRoutes.edit(params.row.id))}
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
    <ListLayout title={t("users")} routes={UserRoutes}>
      <DataGrid
        autoHeight
        rows={users ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("deleteUser")}
        body={t("deleteUserDescription")}
        show={userToDelete !== null}
        onClose={handleConfirmDeleteUser}
      />
    </ListLayout>
  );
};
