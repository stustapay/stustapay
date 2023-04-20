import { Paper, ListItem, IconButton, ListItemText, List, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetUserByIdQuery, useDeleteUserMutation, selectUserById } from "@api";
import { Loading } from "@components/Loading";

export const UserDetail: React.FC = () => {
  const { t } = useTranslation(["users", "common"]);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [deleteUser] = useDeleteUserMutation();
  const { user, error } = useGetUserByIdQuery(Number(userId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      user: data ? selectUserById(data, Number(userId)) : undefined,
    }),
  });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/users" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteUser(Number(userId)).then(() => navigate("/users"));
    }
    setShowConfirmDelete(false);
  };

  if (user === undefined) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/users/${userId}/edit`} color="primary" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButtonLink>
              <Tooltip title={t("delete", { ns: "common" })}>
                <IconButton onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={user.login} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("userLogin")} secondary={user.login} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("userDescription")} secondary={user.description} />
          </ListItem>
        </List>
      </Paper>
      <ConfirmDialog
        title={t("deleteUser")}
        body={t("deleteUserDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteUser}
      />
    </>
  );
};
