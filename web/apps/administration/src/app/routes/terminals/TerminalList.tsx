import * as React from "react";
import { useDeleteTerminalMutation, useGetTerminalsQuery, useGetTerminalProfilesQuery } from "@api";
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
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { IconButtonLink, ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Link as RouterLink } from "react-router-dom";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);

  const { data: terminals, isLoading: isTerminalsLoading } = useGetTerminalsQuery();
  const { data: profiles, isLoading: isProfilesLoading } = useGetTerminalProfilesQuery();
  const [deleteTerminal] = useDeleteTerminalMutation();

  const [terminalToDelete, setTerminalToDelete] = React.useState<number | null>(null);
  if (isTerminalsLoading || isProfilesLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const renderProfile = (id: number | null) => {
    if (id == null) {
      return "";
    }
    const profile = (profiles ?? []).find((profile) => profile.id === id);
    if (!profile) {
      return "";
    }

    return <RouterLink to={`/terminal-profiles/${profile.id}`}>{profile.name}</RouterLink>;
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    setTerminalToDelete(terminalId);
  };

  const handleConfirmDeleteTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && terminalToDelete !== null) {
      deleteTerminal(terminalToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setTerminalToDelete(null);
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/terminals/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("terminals", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="terminals">
          <TableHead>
            <TableRow>
              <TableCell>{t("terminalName")}</TableCell>
              <TableCell>{t("terminalDescription")}</TableCell>
              <TableCell>{t("terminalProfile")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(terminals ?? []).map((terminal) => (
              <TableRow key={terminal.id}>
                <TableCell>
                  <RouterLink to={`/terminals/${terminal.id}`}>{terminal.name}</RouterLink>{" "}
                </TableCell>
                <TableCell>{terminal.description}</TableCell>
                <TableCell>{renderProfile(terminal.active_profile_id)}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/terminals/${terminal.id}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="error" onClick={() => openConfirmDeleteDialog(terminal.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        title={t("deleteTerminal")}
        body={t("deleteTerminalDescription")}
        show={terminalToDelete !== null}
        onClose={handleConfirmDeleteTerminal}
      />
    </>
  );
};
