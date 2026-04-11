import {
  selectEntryAreaById,
  selectTillById,
  selectUserById,
  useDeleteTerminalMutation,
  useForceLogoutUserMutation,
  useGetTerminalQuery,
  useListEntryAreasQuery,
  useListTillsQuery,
  useListUsersQuery,
  useLogoutTerminalMutation,
  useRemoveFromTerminalMutation,
} from "@/api";
import { useListHeadwindMappingsQuery } from "@/api/mdm";
import { config } from "@/api/common";
import { CashierRoutes, MdmRoutes, TerminalRoutes, TillRoutes } from "@/app/routes";
import { TerminalSwitchTill } from "@/components/features";
import { DetailBoolField, DetailField, DetailLayout, DetailView } from "@/components/layouts";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { useCurrentNode } from "@/hooks";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material";
import { Box, Button, ListItem, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { TerminalUserLogin } from "./TerminalUserLogin";

const getHeadwindDeviceLabel = (
  deviceName?: string | null,
  deviceNumber?: string | null,
  serial?: string | null,
  id?: string
) => deviceName ?? deviceNumber ?? serial ?? id ?? "";

export const TerminalDetail: React.FC = () => {
  const { t } = useTranslation();
  const { terminalId } = useParams();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [forceLogoutUser] = useForceLogoutUserMutation();
  const [deleteTerminal] = useDeleteTerminalMutation();
  const [logoutTerminal] = useLogoutTerminalMutation();
  const [removeFromTerminal] = useRemoveFromTerminalMutation();
  const { data: terminal, error: terminalError } = useGetTerminalQuery({
    nodeId: currentNode.id,
    terminalId: Number(terminalId),
  });
  const { data: users, error: userError } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: tills, error: tillError } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: entryAreas } = useListEntryAreasQuery({ nodeId: currentNode.id });
  const { data: headwindMappings, isLoading: isHeadwindMappingsLoading } = useListHeadwindMappingsQuery({
    nodeId: currentNode.id,
  });
  const [switchTillOpen, setSwitchTillOpen] = React.useState(false);
  const [loginUserOpen, setLoginUserOpen] = React.useState(false);

  const openModal = useOpenModal();

  if (terminalError || tillError || userError) {
    toast.error("Error loading terminals or orders");
    return <Navigate to={TerminalRoutes.list()} />;
  }

  const renderUser = (id?: number | null) => {
    if (!id || !users) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  if (terminal === undefined || tills === undefined || isHeadwindMappingsLoading) {
    return <Loading />;
  }

  if (terminal.node_id !== currentNode.id) {
    return <Navigate to={TerminalRoutes.detail(terminal.id, terminal.node_id)} replace />;
  }

  const till = terminal.till_id != null ? selectTillById(tills, terminal.till_id) : undefined;
  const entryArea =
    terminal.entry_area_id != null && entryAreas ? selectEntryAreaById(entryAreas, terminal.entry_area_id) : undefined;
  const headwindMapping = headwindMappings?.find((entry) => entry.terminal_id === terminal.id);

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        deleteTerminal({ nodeId: terminal.node_id, terminalId: Number(terminalId) }).then(() =>
          navigate(TerminalRoutes.list(terminal.node_id))
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
        logoutTerminal({ nodeId: terminal.node_id, terminalId: Number(terminalId) });
        return true;
      },
    });
  };

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

  const openConfirmLogoutDialog = () => {
    openModal({
      type: "confirm",
      title: t("till.forceLogoutUser"),
      content: t("till.forceLogoutUserDescription"),
      onConfirm: () => {
        forceLogoutUser({ nodeId: terminal.node_id, terminalId: Number(terminalId) });
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
          onClick: () => navigate(TerminalRoutes.edit(terminalId, terminal.node_id)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("terminal.switchTill"),
          onClick: () => setSwitchTillOpen(true),
          color: "warning",
          icon: <PointOfSaleIcon />,
          hidden: terminal.mode !== "till",
        },
        ...(till != null
          ? ([
              {
                label: t("terminal.removeTill"),
                onClick: openConfirmRemoveTillDialog,
                color: "warning",
                icon: <PointOfSaleIcon />,
                hidden: terminal.mode !== "till",
              } as const,
            ] as const)
          : []),
        {
          label: t("terminal.loginUser"),
          onClick: () => setLoginUserOpen(true),
          color: "primary",
          icon: <LoginIcon />,
          hidden: terminal.active_user_id != null || terminal.mode !== "till",
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
      <DetailView>
        <DetailField label={t("terminal.id")} value={terminal.id} />
        <DetailField label={t("common.name")} value={terminal.name} />
        <DetailField label={t("common.description")} value={terminal.description} />
        <DetailField label={t("terminal.mode.label")} value={t(`terminal.mode.${terminal.mode}`)} />
        <DetailBoolField label={t("terminal.selfService")} value={terminal.self_service ?? false} />
        {entryArea != null && <DetailField label={t("entry.area")} value={entryArea.name} />}
        {till != null && (
          <DetailField linkTo={TillRoutes.detail(till.id, till.node_id)} label={t("terminal.till")} value={till.name} />
        )}
        <DetailField
          label={t("mdm.device")}
          linkTo={headwindMapping != null ? MdmRoutes.list(currentNode.id) : undefined}
          value={
            headwindMapping != null
              ? getHeadwindDeviceLabel(
                  headwindMapping.headwind_device_name,
                  headwindMapping.headwind_device_number,
                  headwindMapping.headwind_device_serial,
                  headwindMapping.headwind_device_id
                )
              : t("mdm.notMapped")
          }
        />
        {terminal.active_user_id != null && (
          <>
            <DetailField
              label={t("till.activeUser")}
              linkTo={CashierRoutes.detail(terminal.active_user_id)}
              value={renderUser(terminal.active_user_id)}
            />
            <ListItem>
              <Button color="primary" variant="contained" onClick={openConfirmLogoutDialog} startIcon={<LogoutIcon />}>
                {t("till.forceLogoutUser")}
              </Button>
            </ListItem>
          </>
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
      <TerminalSwitchTill
        open={switchTillOpen}
        terminalId={terminal.id}
        nodeId={terminal.node_id}
        onClose={() => setSwitchTillOpen(false)}
      />
      {users && (
        <TerminalUserLogin
          open={loginUserOpen}
          terminalId={terminal.id}
          users={users}
          onClose={() => setLoginUserOpen(false)}
        />
      )}
    </DetailLayout>
  );
};
