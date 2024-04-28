import { useDeleteUserMutation, useGetUserQuery } from "@/api";
import { UserRoutes, UserTagRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListItemLink } from "@/components";
import { DetailLayout } from "@/components/layouts";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const UserDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [deleteUser] = useDeleteUserMutation();
  const { data: user, error } = useGetUserQuery({ nodeId: currentNode.id, userId: Number(userId) });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to={UserRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteUser: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteUser({ nodeId: currentNode.id, userId: Number(userId) }).then(() => navigate(UserRoutes.list()));
    }
    setShowConfirmDelete(false);
  };

  if (user === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout
      title={user.login}
      routes={UserRoutes}
      elementNodeId={user.node_id}
      actions={[
        {
          label: t("user.changePassword.title"),
          onClick: () => navigate(UserRoutes.detailAction(userId, "change-password")),
          color: "primary",
          icon: <EditIcon />,
        },
        { label: t("edit"), onClick: () => navigate(UserRoutes.edit(userId)), color: "primary", icon: <EditIcon /> },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("userLogin")} secondary={user.login} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("userDescription")} secondary={user.description} />
          </ListItem>
          {user.user_tag_id ? (
            <ListItemLink to={UserTagRoutes.detail(user.user_tag_id)}>
              <ListItemText primary={t("user.tagId")} secondary={user.user_tag_id} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("user.tagId")} secondary={t("user.noTagAssigned")} />
            </ListItem>
          )}
        </List>
      </Paper>
      <ConfirmDialog
        title={t("deleteUser")}
        body={t("deleteUserDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteUser}
      />
    </DetailLayout>
  );
};
