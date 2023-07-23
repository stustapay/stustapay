import * as React from "react";
import { Button, Link, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { selectUserAll, useDeleteUserMutation, useListUsersQuery } from "@api";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { formatUserTagUid, User } from "@stustapay/models";
import { ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { Loading } from "@stustapay/components";

export const UserList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { users, isLoading } = useListUsersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      users: data ? selectUserAll(data) : undefined,
    }),
  });
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
      deleteUser({ userId: userToDelete })
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
        <Link component={RouterLink} to={`/users/${params.row.id}`}>
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
      field: "user_tag_uid_hex",
      headerName: t("user.tagUid") as string,
      flex: 1,
      valueFormatter: ({ value }) => formatUserTagUid(value),
    },
    {
      field: "role_names",
      headerName: t("user.roles") as string,
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
          onClick={() => navigate(`/users/${params.row.id}/edit`)}
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
            <Button onClick={addUser} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
            </Button>
          }
        >
          <ListItemText primary={t("users")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
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
    </Stack>
  );
};
