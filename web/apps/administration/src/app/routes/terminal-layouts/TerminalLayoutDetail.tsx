import { Paper, ListItem, IconButton, Typography, ListItemText, List, Tooltip, Checkbox, Divider } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTerminalLayoutByIdQuery, useDeleteTerminalLayoutMutation, useGetTerminalButtonsQuery } from "@api";
import { Loading } from "@components/Loading";
import { TerminalButton } from "@models";

export const TerminalLayoutDetail: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const [deleteLayout] = useDeleteTerminalLayoutMutation();
  const { data: layout, error } = useGetTerminalLayoutByIdQuery(Number(layoutId));
  const { data: buttons, error: buttonsError } = useGetTerminalButtonsQuery();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error || buttonsError) {
    return <Navigate to="/terminal-layouts" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteLayout(Number(layoutId)).then(() => navigate("/terminal-layouts"));
    }
    setShowConfirmDelete(false);
  };

  if (layout === undefined || buttons === undefined) {
    return <Loading />;
  }

  const sortedButtons =
    layout.button_ids == null
      ? []
      : [...layout.button_ids].map((i) => buttons.find((b) => b.id === i) as TerminalButton);

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/terminal-layouts/${layoutId}/edit`} color="primary" sx={{ mr: 1 }}>
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
          <ListItemText primary={layout.name} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("layout.name")} secondary={layout.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("layout.description")} secondary={layout.description} />
          </ListItem>
          <ListItem secondaryAction={<Checkbox edge="end" checked={layout.allow_top_up} disabled={true} />}>
            <ListItemText primary={t("layout.allowTopUp")} />
          </ListItem>
        </List>
      </Paper>
      {sortedButtons.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <List>
            <ListItem>
              <Typography variant="h6">{t("button.buttons")}</Typography>
            </ListItem>
            <Divider />
            {sortedButtons.map((button) => (
              <ListItem key={button.id}>
                <ListItemText primary={button.name} secondary={`${button.price}€`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      <ConfirmDialog
        title={t("layout.delete")}
        body={t("layout.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteLayout}
      />
    </>
  );
};
