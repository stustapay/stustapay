import { Paper, ListItem, IconButton, ListItemText, List, Tooltip, Checkbox } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  useGetTillProfileByIdQuery,
  useDeleteTillProfileMutation,
  selectTillProfileById,
  selectTillLayoutById,
  useGetTillLayoutsQuery,
} from "@api";
import { Loading } from "@stustapay/components";

export const TillProfileDetail: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [deleteProfile] = useDeleteTillProfileMutation();
  const { profile, error } = useGetTillProfileByIdQuery(Number(profileId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      profile: data ? selectTillProfileById(data, Number(profileId)) : undefined,
    }),
  });

  const { data: layouts, error: layoutError } = useGetTillLayoutsQuery();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error || layoutError) {
    return <Navigate to="/till-profiles" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteProfile(Number(profileId)).then(() => navigate("/till-profiles"));
    }
    setShowConfirmDelete(false);
  };

  if (profile === undefined || layouts === undefined) {
    return <Loading />;
  }

  const layout = selectTillLayoutById(layouts, profile.layout_id);

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/till-profiles/${profileId}/edit`} color="primary" sx={{ mr: 1 }}>
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
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("profile.name")} secondary={profile.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("profile.description")} secondary={profile.description} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={profile.allow_top_up} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("profile.allowTopUp")} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={profile.allow_cash_out} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("profile.allowCashOut")} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={profile.allow_ticket_sale} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("profile.allowTicketSale")} />
          </ListItem>
          {layout && (
            <ListItem>
              <ListItemText
                primary={t("profile.layout")}
                secondary={<RouterLink to={`/till-layouts/${layout.id}`}>{layout.name}</RouterLink>}
              />
            </ListItem>
          )}
        </List>
      </Paper>
      <ConfirmDialog
        title={t("profile.delete")}
        body={t("profile.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteProfile}
      />
    </>
  );
};
