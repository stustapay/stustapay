import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Logout as LogoutIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material";
import { Box, Button, Grid, ListItem, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  useForceLogoutUserMutation,
  useLogoutTerminalMutation,
  useRemoveFromTerminalMutation,
} from "@/api";
import { config } from "@/api/common";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { TerminalSwitchTill } from "@/components/features";
import {
  DetailBoolField,
  DetailField,
  DetailLayout,
  DetailView,
  UserDetailField,
} from "@/components/layouts";
import {
  getTerminalCollection,
  getTillCollection,
  getUserCollection,
  refetchNodeCollection,
  refetchTillTerminalCollections,
} from "@/db/collections";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";

import { TerminalMap } from "./TerminalMap";

export const TerminalDetail: React.FC = () => {
  const { t } = useTranslation();
  const { terminalId } = useParams();
  const { currentNode } = useCurrentNode();
  const { eventSettings } = useCurrentEventSettings();
  const navigate = useNavigate();

  const [forceLogoutUser] = useForceLogoutUserMutation();
  const [logoutTerminal] = useLogoutTerminalMutation();
  const [removeFromTerminal] = useRemoveFromTerminalMutation();
  const {
    data: terminal,
    isLoading: isTerminalLoading,
    isError: isTerminalError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ terminals: getTerminalCollection(currentNode.id) })
        .where(({ terminals }) => eq(terminals.id, Number(terminalId)))
        .join(
          { tills: getTillCollection(currentNode.id) },
          ({ tills, terminals }) => eq(terminals.till_id, tills.id),
          "left" as const,
        )
        .join(
          { activeUsers: getUserCollection(currentNode.id) },
          ({ activeUsers, terminals }) => eq(terminals.active_user_id, activeUsers.id),
          "left" as const,
        )
        .select(({ activeUsers, terminals, tills }) => ({
          ...terminals,
          till: tills,
          activeUser: activeUsers,
        }))
        .findOne(),
    [currentNode.id, terminalId],
  );
  const [switchTillOpen, setSwitchTillOpen] = React.useState(false);

  const openModal = useOpenModal();

  if (isTerminalError) {
    toast.error("Error loading terminals or orders");
    return <Navigate to={TerminalRoutes.action("list")} />;
  }

  if (isTerminalLoading || !terminal) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        getTerminalCollection(currentNode.id)
          .delete(Number(terminalId))
          .isPersisted.promise.then(() => navigate(TerminalRoutes.action("list")));
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
        logoutTerminal({ nodeId: currentNode.id, terminalId: Number(terminalId) }).then(() =>
          refetchNodeCollection(currentNode.id, "terminals"),
        );
        return true;
      },
    });
  };

  const openConfirmRemoveTillDialog = () => {
    const till = terminal.till;
    const tillId = terminal.till_id;
    if (tillId == null || !till) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("terminal.removeTill"),
      content: t("terminal.removeTillDescription", { tillName: till.name }),
      onConfirm: () => {
        removeFromTerminal({ nodeId: till.node_id ?? currentNode.id, tillId }).then(() =>
          refetchTillTerminalCollections(currentNode.id),
        );
      },
    });
  };

  const openConfirmLogoutDialog = () => {
    openModal({
      type: "confirm",
      title: t("till.forceLogoutUser"),
      content: t("till.forceLogoutUserDescription"),
      onConfirm: () => {
        forceLogoutUser({ nodeId: currentNode.id, terminalId: Number(terminalId) }).then(() =>
          refetchNodeCollection(currentNode.id, "terminals"),
        );
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
        ...(terminal.till != null
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
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: terminal.registration_uuid != null ? 6 : 12 }}>
          <DetailView>
            <DetailField label={t("terminal.id")} value={terminal.id} />
            <DetailField label={t("common.name")} value={terminal.name} />
            <DetailField label={t("common.description")} value={terminal.description} />
            <DetailField label={t("terminal.lastSeen")} value={terminal.last_seen} />
            {terminal.till != null && (
              <DetailField
                linkTo={TillRoutes.detail(terminal.till.id, terminal.till.node_id)}
                label={t("terminal.till")}
                value={terminal.till.name}
              />
            )}
            {terminal.active_user_id != null && (
              <>
                <UserDetailField
                  label={t("till.activeUser")}
                  user={terminal.activeUser}
                  fallbackNodeId={terminal.node_id}
                />
                <ListItem>
                  <Button
                    color="error"
                    variant="contained"
                    onClick={openConfirmLogoutDialog}
                    startIcon={<LogoutIcon />}
                  >
                    {t("till.forceLogoutUser")}
                  </Button>
                </ListItem>
              </>
            )}
            {terminal.registration_uuid != null && (
              <DetailField
                label={t("terminal.registrationUUID")}
                value={terminal.registration_uuid}
              />
            )}
            <DetailBoolField label={t("terminal.loggedIn")} value={terminal.session_uuid != null} />
            {terminal.mdm_device_id != null && (
              <DetailField label={t("terminal.mdm.deviceId")} value={terminal.mdm_device_id} />
            )}
          </DetailView>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {terminal.registration_uuid != null && (
            <Paper
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  padding: 2,
                  backgroundColor: "white",
                  margin: "0 auto",
                  maxWidth: "20em",
                  width: "100%",
                }}
              >
                <QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={encodeTerminalRegistrationQrCode(
                    config.terminalApiBaseUrl,
                    terminal.registration_uuid,
                  )}
                  viewBox={`0 0 256 256`}
                />
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
      {terminal.mdm_device_id != null && eventSettings.headwind_enabled && (
        <Paper>
          <TerminalMap mdmDeviceId={terminal.mdm_device_id} label={terminal.name} />
        </Paper>
      )}
      <TerminalSwitchTill
        open={switchTillOpen}
        terminalId={terminal.id}
        onClose={() => setSwitchTillOpen(false)}
      />
    </DetailLayout>
  );
};
