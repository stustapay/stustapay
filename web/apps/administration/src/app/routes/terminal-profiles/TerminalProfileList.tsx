import * as React from "react";
import { useDeleteTerminalProfileMutation, useGetTerminalLayoutsQuery, useGetTerminalProfilesQuery } from "@api";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  Typography,
  ListItem,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { IconButtonLink, ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Link as RouterLink } from "react-router-dom";

export const TerminalProfileList: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);

  const { data: profiles, isLoading: isTerminalsLoading } = useGetTerminalProfilesQuery();
  const { data: layouts, isLoading: isLayoutsLoading } = useGetTerminalLayoutsQuery();
  const [deleteTerminal] = useDeleteTerminalProfileMutation();

  const [profileToDelete, setProfileToDelete] = React.useState<number | null>(null);
  if (isTerminalsLoading || isLayoutsLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const renderLayout = (id: number) => {
    const layout = (layouts ?? []).find((layout) => layout.id === id);
    if (!layout) {
      return "";
    }

    return <RouterLink to={`/terminal-layouts/${layout.id}`}>{layout.name}</RouterLink>;
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    setProfileToDelete(terminalId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && profileToDelete !== null) {
      deleteTerminal(profileToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setProfileToDelete(null);
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/terminal-profiles/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("terminalProfiles", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="terminal-profiles">
          <TableHead>
            <TableRow>
              <TableCell>{t("profileName")}</TableCell>
              <TableCell>{t("profileDescription")}</TableCell>
              <TableCell>{t("profileLayout")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(profiles ?? []).map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <RouterLink to={`/terminal-profiles/${profile.id}`}>{profile.name}</RouterLink>
                </TableCell>
                <TableCell>{profile.description}</TableCell>
                <TableCell>{renderLayout(profile.layout_id)}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/terminal-profiles/${profile.id}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="error" onClick={() => openConfirmDeleteDialog(profile.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        title={t("deleteProfile")}
        body={t("deleteProfileDescription")}
        show={profileToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </>
  );
};
