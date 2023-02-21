import * as React from "react";
import { useDeleteTerminalLayoutMutation, useGetTerminalLayoutsQuery } from "@api";
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

export const TerminalLayoutList: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);

  const { data: layouts, isLoading: isTerminalsLoading } = useGetTerminalLayoutsQuery();
  const [deleteTerminal] = useDeleteTerminalLayoutMutation();

  const [layoutToDelete, setLayoutToDelete] = React.useState<number | null>(null);
  if (isTerminalsLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const openConfirmDeleteDialog = (terminalId: number) => {
    setLayoutToDelete(terminalId);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && layoutToDelete !== null) {
      deleteTerminal(layoutToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setLayoutToDelete(null);
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/terminal-layouts/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("terminalLayouts", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="terminal-layouts">
          <TableHead>
            <TableRow>
              <TableCell>{t("layoutName")}</TableCell>
              <TableCell>{t("layoutDescription")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(layouts ?? []).map((layout) => (
              <TableRow key={layout.id}>
                <TableCell>
                  <RouterLink to={`/terminal-layouts/${layout.id}`}>{layout.name}</RouterLink>{" "}
                </TableCell>
                <TableCell>{layout.description}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/terminal-layouts/${layout.id}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="error" onClick={() => openConfirmDeleteDialog(layout.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        title={t("deleteLayout")}
        body={t("deleteLayoutDescription")}
        show={layoutToDelete !== null}
        onClose={handleConfirmDeleteLayout}
      />
    </>
  );
};
