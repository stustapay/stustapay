import { UserRoleRoutes } from "@/app/routes";
import { UserRole, selectUserRoleAll, useDeleteUserRoleMutation, useListUserRolesQuery } from "@api";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@components";
import { useCurrentNode } from "@hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const UserRoleList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

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
  const [userRoleToDelete, setUserRoleToDelete] = React.useState<number | null>(null);

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (userId: number) => {
    setUserRoleToDelete(userId);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && userRoleToDelete !== null) {
      deleteUserRole({ nodeId: currentNode.id, userRoleId: userRoleToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setUserRoleToDelete(null);
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
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
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
      ],
    },
  ];

  return (
    <ListLayout title={t("userRoles")} routes={UserRoleRoutes}>
      <DataGrid
        autoHeight
        rows={userRoles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("userRole.delete")}
        body={t("userRole.deleteDescription")}
        show={userRoleToDelete !== null}
        onClose={handleConfirmDeleteUser}
      />
    </ListLayout>
  );
};
