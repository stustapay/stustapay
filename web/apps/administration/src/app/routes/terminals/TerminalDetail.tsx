import {
  selectTillById,
  useDeleteTerminalMutation,
  useGetTerminalQuery,
  useListTillsQuery,
  useLogoutTerminalMutation,
  useRemoveFromTerminalMutation,
} from "@/api";
import { config } from "@/api/common";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { TerminalSwitchTill } from "@/components/features";
import { DetailBoolField, DetailField, DetailLayout, DetailView } from "@/components/layouts";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { useCurrentNode } from "@/hooks";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Logout as LogoutIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material";
import { Box, Paper } from "@mui/material";
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
  const [removeFromTerminal] = useRemoveFromTerminalMutation();
  const { data: terminal, error: terminalError } = useGetTerminalQuery({
    nodeId: currentNode.id,
    terminalId: Number(terminalId),
  });
  const { data: tills, error: tillError } = useListTillsQuery({ nodeId: currentNode.id });
  const [switchTillOpen, setSwitchTillOpen] = React.useState(false);

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
  const till = terminal.till_id != null ? selectTillById(tills, terminal.till_id) : undefined;

  const openConfirmRemoveTillDialog = () => {
    if (!till) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("terminal.removeTill"),
      content: t("terminal.removeTillDescription", { tillName: till.name }),
      onConfirm: () => {
        removeFromTerminal({ nodeId: till.node_id, tillId: till.id });
      },
    });
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
          label: t("terminal.switchTill"),
          onClick: () => setSwitchTillOpen(true),
          color: "warning",
          icon: <PointOfSaleIcon />,
        },
        ...(till != null
          ? ([
              {
                label: t("terminal.removeTill"),
                onClick: openConfirmRemoveTillDialog,
                color: "warning",
                icon: <PointOfSaleIcon />,
              } as const,
            ] as const)
          : []),
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
      <DetailView>
        <DetailField label={t("terminal.id")} value={terminal.id} />
        <DetailField label={t("common.name")} value={terminal.name} />
        <DetailField label={t("common.description")} value={terminal.description} />
        {till != null && (
          <DetailField linkTo={TillRoutes.detail(till.id, till.node_id)} label={t("terminal.till")} value={till.name} />
        )}
        {terminal.registration_uuid != null && (
          <DetailField label={t("terminal.registrationUUID")} value={terminal.registration_uuid} />
        )}
        <DetailBoolField label={t("terminal.loggedIn")} value={terminal.session_uuid != null} />
      </DetailView>
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
      <TerminalSwitchTill open={switchTillOpen} terminalId={terminal.id} onClose={() => setSwitchTillOpen(false)} />
    </DetailLayout>
  );
};
