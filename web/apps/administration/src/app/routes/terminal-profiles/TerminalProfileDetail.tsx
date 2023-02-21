import { Paper, ListItem, IconButton, Typography, ListItemText, List, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTerminalProfileByIdQuery, useDeleteTerminalProfileMutation } from "@api";
import { Loading } from "@components/Loading";

export const TerminalProfileDetail: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [deleteProfile] = useDeleteTerminalProfileMutation();
  const { data: profile, error } = useGetTerminalProfileByIdQuery(Number(profileId));
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/terminal-profiles" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteProfile(Number(profileId)).then(() => navigate("/terminal-profiles"));
    }
    setShowConfirmDelete(false);
  };

  if (profile === undefined) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/terminal-profiles/${profileId}/edit`} color="primary" sx={{ mr: 1 }}>
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
          <ListItemText primary={profile.name} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("profileName")} secondary={profile.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("profileDescription")} secondary={profile.description} />
          </ListItem>
        </List>
      </Paper>
      <ConfirmDialog
        title={t("deleteProfile")}
        body={t("deleteProfileDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteProfile}
      />
    </>
  );
};
