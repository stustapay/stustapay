import { Paper, ListItem, IconButton, Typography, ListItemText, Button, List, Checkbox, Tooltip } from "@mui/material";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTerminalByIdQuery, useDeleteTerminalMutation, useLogoutTerminalMutation } from "@api";
import { Loading } from "@components/Loading";

export const TerminalDetail: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { terminalId } = useParams();
  const navigate = useNavigate();
  const [deleteTerminal] = useDeleteTerminalMutation();
  const [logoutTerminal] = useLogoutTerminalMutation();
  const { data: terminal, error } = useGetTerminalByIdQuery(Number(terminalId));
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/terminals" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTerminal(Number(terminalId)).then(() => navigate("/terminals"));
    }
    setShowConfirmDelete(false);
  };

  const performLogoutTerminal = () => {
    logoutTerminal(Number(terminalId));
  };

  if (terminal === undefined) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/terminals/${terminalId}/edit`} color="primary" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButtonLink>
              {!terminal.is_logged_in && (
                <Tooltip title={t("logoutTerminal")}>
                  <IconButton onClick={performLogoutTerminal} color="warning">
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t("delete", { ns: "common" })}>
                <IconButton onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={terminal.name} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("terminalName")} secondary={terminal.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("terminalDescription")} secondary={terminal.description} />
          </ListItem>
        </List>
        {terminal.registration_uuid != null && (
          <ListItem>
            <ListItemText primary={t("terminalRegistrationUUID")} secondary={terminal.registration_uuid} />
          </ListItem>
        )}
        <ListItem secondaryAction={<Checkbox edge="end" checked={terminal.is_logged_in} disabled={true} />}>
          <ListItemText primary={t("terminalLoggedIn")} />
        </ListItem>
      </Paper>
      <ConfirmDialog
        title={t("deleteTerminal")}
        body={t("deleteTerminalDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTerminal}
      />
    </>
  );
};
