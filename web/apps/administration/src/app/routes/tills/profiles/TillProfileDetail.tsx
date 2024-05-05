import {
  selectTillLayoutById,
  useDeleteTillProfileMutation,
  useGetTillProfileQuery,
  useListTillLayoutsQuery,
} from "@/api";
import { TillLayoutRoutes, TillProfileRoutes } from "@/app/routes";
import { DetailLayout } from "@/components/layouts";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Checkbox, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink, useNavigate, useParams } from "react-router-dom";

export const TillProfileDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const [deleteProfile] = useDeleteTillProfileMutation();
  const { data: profile, error } = useGetTillProfileQuery({ nodeId: currentNode.id, profileId: Number(profileId) });

  const { data: layouts, error: layoutError } = useListTillLayoutsQuery({ nodeId: currentNode.id });

  if (error || layoutError) {
    return <Navigate to={TillProfileRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("profile.delete"),
      content: t("profile.deleteDescription"),
      onConfirm: () => {
        deleteProfile({ nodeId: currentNode.id, profileId: Number(profileId) }).then(() =>
          navigate(TillProfileRoutes.list())
        );
      },
    });
  };

  if (profile === undefined || layouts === undefined) {
    return <Loading />;
  }

  const layout = selectTillLayoutById(layouts, profile.layout_id);

  return (
    <DetailLayout
      title={profile.name}
      routes={TillProfileRoutes}
      elementNodeId={profile.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TillProfileRoutes.edit(profileId)),
          color: "primary",
          icon: <EditIcon />,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <Paper>
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
                secondary={<RouterLink to={TillLayoutRoutes.detail(layout.id)}>{layout.name}</RouterLink>}
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </DetailLayout>
  );
};
