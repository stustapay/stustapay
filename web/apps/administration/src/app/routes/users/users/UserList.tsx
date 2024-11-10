import { selectUserAll, useDeleteUserMutation, useListUsersQuery, User } from "@/api";
import { UserRoutes, UserTagRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const UserList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageUsers = useCurrentUserHasPrivilege(UserRoutes.privilege);
  const canManageUsersAtNode = useCurrentUserHasPrivilegeAtNode(UserRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

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
  const { dataGridNodeColumn } = useRenderNode();

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userId: number) => {
    openModal({
      type: "confirm",
      title: t("deleteUser"),
      content: t("deleteUserDescription"),
      onConfirm: () => {
        deleteUser({ nodeId: currentNode.id, userId })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const columns: GridColDef<User>[] = [
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
      field: "description",
      headerName: t("userDescription"),
      flex: 2,
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
    </ListLayout>
  );
};
