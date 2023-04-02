import { Paper, ListItem, IconButton, Typography, ListItemText, List, Checkbox, Tooltip, Box } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTillByIdQuery, useDeleteTillMutation, useLogoutTillMutation, selectTillById } from "@api";
import { Loading } from "@components/Loading";
import QRCode from "react-qr-code";
import { encodeTillRegistrationQrCode } from "@core";
import { config } from "@api/common";

export const TillDetail: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const { tillId } = useParams();
  const navigate = useNavigate();
  const [deleteTill] = useDeleteTillMutation();
  const [logoutTill] = useLogoutTillMutation();
  const { till, error } = useGetTillByIdQuery(Number(tillId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      till: data ? selectTillById(data, Number(tillId)) : undefined,
    }),
  });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/tills" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTill(Number(tillId)).then(() => navigate("/tills"));
    }
    setShowConfirmDelete(false);
  };

  const performLogoutTill = () => {
    logoutTill(Number(tillId));
  };

  if (till === undefined) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/tills/${tillId}/edit`} color="primary" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButtonLink>
              {till.session_uuid != null && (
                <Tooltip title={t("logoutTill")}>
                  <IconButton onClick={performLogoutTill} color="warning">
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
          <ListItemText primary={till.name} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("till.id")} secondary={till.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("till.name")} secondary={till.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("till.description")} secondary={till.description} />
          </ListItem>
        </List>
        {till.registration_uuid != null && (
          <ListItem>
            <ListItemText primary={t("till.registrationUUID")} secondary={till.registration_uuid} />
          </ListItem>
        )}
        <ListItem secondaryAction={<Checkbox edge="end" checked={till.session_uuid != null} disabled={true} />}>
          <ListItemText primary={t("till.loggedIn")} />
        </ListItem>
      </Paper>
      {till.registration_uuid != null && (
        <Paper>
          <Box sx={{ height: "auto", margin: "0 auto", maxWidth: "20em", width: "100%", mt: 2 }}>
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={encodeTillRegistrationQrCode(config.terminalApiBaseUrl, till.registration_uuid)}
              viewBox={`0 0 256 256`}
            />
          </Box>
        </Paper>
      )}
      <ConfirmDialog
        title={t("till.delete")}
        body={t("till.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTill}
      />
    </>
  );
};
