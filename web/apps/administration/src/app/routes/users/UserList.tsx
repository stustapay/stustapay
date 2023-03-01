import * as React from "react";
import { Paper, Button, Typography, ListItem, ListItemText } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useDeleteUserMutation, useGetUsersQuery } from "@api";
import { DataGrid, GridActionsCellItem, GridColumns } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { User } from "@models";
import { Loading, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";

export const UserList: React.FC = () => {
  const { t } = useTranslation(["users", "common"]);
  const navigate = useNavigate();

  const { data: users, isLoading } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [userToDelete, setUserToDelete] = React.useState<number | null>(null);

  if (isLoading) {
    return <Loading />;
  }

  const addUser = () => {
    navigate("/users/new");
  };

  const openConfirmDeleteDialog = (userId: number) => {
    setUserToDelete(userId);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && userToDelete !== null) {
      deleteUser(userToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setUserToDelete(null);
  };

  const columns: GridColumns<User> = [
    {
      field: "name",
      headerName: t("userName") as string,
      flex: 1,
    },
    {
      field: "description",
      headerName: t("userDescription") as string,
      flex: 2,
    },
    {
      field: "privileges",
      headerName: t("userPrivileges") as string,
      flex: 0.5,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions", { ns: "common" }) as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit", { ns: "common" })}
          onClick={() => navigate(`/terminals/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete", { ns: "common" })}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <Button onClick={addUser} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </Button>
          }
        >
          <ListItemText primary={t("users", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={users ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("deleteUser")}
        body={t("deleteUserDescription")}
        show={userToDelete !== null}
        onClose={handleConfirmDeleteUser}
      />
    </>
  );
};
