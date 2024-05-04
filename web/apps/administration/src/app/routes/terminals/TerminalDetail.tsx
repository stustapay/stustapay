import {
  selectTillById,
  useDeleteTerminalMutation,
  useGetTerminalQuery,
  useListTillsQuery,
  useLogoutTerminalMutation,
} from "@/api";
import { config } from "@/api/common";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { ListItemLink } from "@/components";
import { DetailLayout } from "@/components/layouts";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { Box, Checkbox, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
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

  const [deleteTerminal] = useDeleteTerminalMutation();
  const [logoutTerminal] = useLogoutTerminalMutation();
  const { data: terminal, error: terminalError } = useGetTerminalQuery({
    nodeId: currentNode.id,
    terminalId: Number(terminalId),
  });
  const { data: tills, error: tillError } = useListTillsQuery({ nodeId: currentNode.id });

  const openModal = useOpenModal();

  if (terminalError || tillError) {
    toast.error("Error loading terminals or orders");
    return <Navigate to={TerminalRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        deleteTerminal({ nodeId: currentNode.id, terminalId: Number(terminalId) }).then(() =>
          navigate(TerminalRoutes.list())
        );
        return true;
      },
    });
  };

  const openUnregisterTerminalDialog = () => {
    openModal({
      type: "confirm",
      title: t("terminal.unregisterTerminal"),
      content: t("terminal.unregisterTerminalDescription"),
      onConfirm: () => {
        logoutTerminal({ nodeId: currentNode.id, terminalId: Number(terminalId) });
        return true;
      },
    });
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
    </DetailLayout>
  );
};
