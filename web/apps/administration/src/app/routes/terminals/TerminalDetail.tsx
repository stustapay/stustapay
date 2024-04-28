import {
  selectTillById,
  useDeleteTerminalMutation,
  useGetTerminalQuery,
  useListTillsQuery,
  useLogoutTerminalMutation,
} from "@/api";
import { config } from "@/api/common";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListItemLink } from "@/components";
import { DetailLayout } from "@/components/layouts";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { Box, Checkbox, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const TerminalDetail: React.FC = () => {
  const { t } = useTranslation();
  const { terminalId } = useParams();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [showUnregisterTerminalDlg, setShowUnregisterTerminalDlg] = React.useState(false);

  const [deleteTerminal] = useDeleteTerminalMutation();
  const [logoutTerminal] = useLogoutTerminalMutation();
  const { data: terminal, error: terminalError } = useGetTerminalQuery({
    nodeId: currentNode.id,
    terminalId: Number(terminalId),
  });
  const { data: tills, error: tillError } = useListTillsQuery({ nodeId: currentNode.id });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (terminalError || tillError) {
    toast.error("Error loading terminals or orders");
    return <Navigate to={TerminalRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTerminal({ nodeId: currentNode.id, terminalId: Number(terminalId) }).then(() =>
        navigate(TerminalRoutes.list())
      );
    }
    setShowConfirmDelete(false);
  };

  const openUnregisterTerminalDialog = () => {
    setShowUnregisterTerminalDlg(true);
  };

  const handleUnregisterTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      logoutTerminal({ nodeId: currentNode.id, terminalId: Number(terminalId) });
    }
    setShowUnregisterTerminalDlg(false);
  };

  if (terminal === undefined || tills === undefined) {
    return <Loading />;
  }

  const renderTill = (id: number) => {
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return till.name;
  };

  return (
    <DetailLayout
      title={terminal.name}
      routes={TerminalRoutes}
      elementNodeId={terminal.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TerminalRoutes.edit(terminalId)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("terminal.logout"),
          onClick: openUnregisterTerminalDialog,
          color: "warning",
          icon: <LogoutIcon />,
          hidden: terminal.session_uuid == null,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("terminal.id")} secondary={terminal.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("common.name")} secondary={terminal.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("common.description")} secondary={terminal.description} />
          </ListItem>
          {terminal.till_id != null && (
            <ListItemLink to={TillRoutes.detail(terminal.till_id)}>
              <ListItemText primary={t("terminal.till")} secondary={renderTill(terminal.till_id)} />
            </ListItemLink>
          )}
          {terminal.registration_uuid != null && (
            <ListItem>
              <ListItemText primary={t("terminal.registrationUUID")} secondary={terminal.registration_uuid} />
            </ListItem>
          )}
          <ListItem secondaryAction={<Checkbox edge="end" checked={terminal.session_uuid != null} disabled={true} />}>
            <ListItemText primary={t("terminal.loggedIn")} />
          </ListItem>
        </List>
      </Paper>
      {terminal.registration_uuid != null && (
        <Paper>
          <Box
            sx={{
              padding: 2,
              backgroundColor: "white",
              height: "auto",
              margin: "0 auto",
              maxWidth: "20em",
              width: "100%",
              mt: 2,
            }}
          >
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={encodeTerminalRegistrationQrCode(config.terminalApiBaseUrl, terminal.registration_uuid)}
              viewBox={`0 0 256 256`}
            />
          </Box>
        </Paper>
      )}
      <ConfirmDialog
        title={t("terminal.unregisterTerminal")}
        body={t("terminal.unregisterTerminalDescription")}
        show={showUnregisterTerminalDlg}
        onClose={handleUnregisterTerminal}
      />
      <ConfirmDialog
        title={t("terminal.delete")}
        body={t("terminal.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTerminal}
      />
    </DetailLayout>
  );
};
