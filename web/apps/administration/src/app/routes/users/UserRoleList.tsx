import * as React from "react";
import { Button, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { selectUserRoleAll, useDeleteUserRoleMutation, useListUserRolesQuery, UserRole } from "@api";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { Loading } from "@stustapay/components";

export const UserRoleList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { userRoles, isLoading } = useListUserRolesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      userRoles: data ? selectUserRoleAll(data) : undefined,
    }),
  });
  const [deleteUserRole] = useDeleteUserRoleMutation();
  const [userRoleToDelete, setUserRoleToDelete] = React.useState<number | null>(null);

  if (isLoading) {
    return <Loading />;
  }

  const addUserRole = () => {
    navigate("/user-roles/new");
  };

  const openConfirmDeleteDialog = (userId: number) => {
    setUserRoleToDelete(userId);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && userRoleToDelete !== null) {
      deleteUserRole({ userRoleId: userRoleToDelete })
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
          onClick={() => navigate(`/user-roles/${params.row.id}/edit`)}
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
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <Button onClick={addUserRole} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
            </Button>
          }
        >
          <ListItemText primary={t("userRoles")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
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
    </Stack>
  );
};
