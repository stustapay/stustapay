import {
  Paper,
  ListItem,
  IconButton,
  Typography,
  ListItemText,
  Button,
  List,
  Checkbox,
  Tooltip,
  Box,
} from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTerminalByIdQuery, useDeleteTerminalMutation, useLogoutTerminalMutation } from "@api";
import { Loading } from "@components/Loading";
import QRCode from "react-qr-code";
import { encodeTerminalRegistrationQrCode } from "src/core";
import { baseUrl } from "@api/common";

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
              {terminal.session_uuid != null && (
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
            <ListItemText primary={t("terminal.id")} secondary={terminal.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("terminal.name")} secondary={terminal.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("terminal.description")} secondary={terminal.description} />
          </ListItem>
        </List>
        {terminal.registration_uuid != null && (
          <ListItem>
            <ListItemText primary={t("terminal.registrationUUID")} secondary={terminal.registration_uuid} />
          </ListItem>
        )}
        <ListItem secondaryAction={<Checkbox edge="end" checked={terminal.session_uuid != null} disabled={true} />}>
          <ListItemText primary={t("terminal.loggedIn")} />
        </ListItem>
      </Paper>
      {terminal.registration_uuid != null && (
        <Paper>
          <Box sx={{ height: "auto", margin: "0 auto", maxWidth: "20em", width: "100%", mt: 2 }}>
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={encodeTerminalRegistrationQrCode(baseUrl, terminal.registration_uuid)}
              viewBox={`0 0 256 256`}
            />
          </Box>
        </Paper>
      )}
      <ConfirmDialog
        title={t("terminal.delete")}
        body={t("terminal.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTerminal}
      />
    </>
  );
};
