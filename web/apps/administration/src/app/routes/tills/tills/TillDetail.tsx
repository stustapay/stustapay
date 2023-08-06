import {
  selectOrderAll,
  selectTillProfileById,
  selectUserById,
  useDeleteTillMutation,
  useForceLogoutUserMutation,
  useGetTillQuery,
  useListOrdersByTillQuery,
  useListTillProfilesQuery,
  useListUsersQuery,
  useLogoutTillMutation,
} from "@/api";
import { config } from "@/api/common";
import { CashierRoutes, TillProfileRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListItemLink } from "@/components";
import { OrderTable } from "@/components/features";
import { DetailLayout } from "@/components/layouts";
import { encodeTillRegistrationQrCode } from "@/core";
import { useCurrencyFormatter } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { Box, Button, Checkbox, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const TillDetail: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const [showForceLogoutDlg, setShowForceLogoutDlg] = React.useState(false);
  const [showUnregisterTillDlg, setShowUnregisterTillDlg] = React.useState(false);

  const [forceLogoutUser] = useForceLogoutUserMutation();
  const [deleteTill] = useDeleteTillMutation();
  const [logoutTill] = useLogoutTillMutation();
  const { data: till, error: tillError } = useGetTillQuery({ tillId: Number(tillId) });
  const { orders, error: orderError } = useListOrdersByTillQuery(
    { tillId: Number(tillId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );
  const { data: profiles, error: profileError } = useListTillProfilesQuery();
  const { data: users, error: userError } = useListUsersQuery();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (tillError || orderError || userError || profileError) {
    toast.error("Error loading tills or orders");
    return <Navigate to={TillRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTill({ tillId: Number(tillId) }).then(() => navigate(TillRoutes.list()));
    }
    setShowConfirmDelete(false);
  };

  const openUnregisterTillDialog = () => {
    setShowUnregisterTillDlg(true);
  };

  const handleUnregisterTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      logoutTill({ tillId: Number(tillId) });
    }
    setShowUnregisterTillDlg(false);
  };

  if (till === undefined) {
    return <Loading />;
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

  const renderProfile = (id: number) => {
    if (!profiles) {
      return "";
    }

    const profile = selectTillProfileById(profiles, id);
    if (!profile) {
      return "";
    }

    return profile.name;
  };

  const openConfirmLogoutDialog = () => {
    setShowForceLogoutDlg(true);
  };

  const handleConfirmForceLogout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      forceLogoutUser({ tillId: Number(tillId) });
    }
    setShowForceLogoutDlg(false);
  };

  return (
    <DetailLayout
      title={till.name}
      actions={[
        { label: t("edit"), onClick: () => navigate(TillRoutes.edit(tillId)), color: "primary", icon: <EditIcon /> },
        {
          label: t("till.logout"),
          onClick: openUnregisterTillDialog,
          color: "warning",
          icon: <LogoutIcon />,
          hidden: till.session_uuid == null,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("till.id")} secondary={till.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("till.name")} secondary={till.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("till.description")} secondary={till.description} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("till.tseSerial")} secondary={till.tse_serial} />
          </ListItem>
          <ListItemLink to={TillProfileRoutes.detail(till.active_profile_id)}>
            <ListItemText primary={t("till.profile")} secondary={renderProfile(till.active_profile_id)} />
          </ListItemLink>
          {till.active_user_id != null && (
            <>
              <ListItemLink to={CashierRoutes.detail(till.active_user_id)}>
                <ListItemText primary={t("till.activeUser")} secondary={renderUser(till.active_user_id)} />
              </ListItemLink>
              <ListItem>
                <Button color="error" variant="contained" onClick={openConfirmLogoutDialog}>
                  {t("till.forceLogoutUser")}
                </Button>
              </ListItem>
            </>
          )}
          {till.current_cash_register_name != null && (
            <ListItem>
              <ListItemText primary={t("till.cashRegisterName")} secondary={till.current_cash_register_name} />
            </ListItem>
          )}
          {till.current_cash_register_balance != null && (
            <ListItem>
              <ListItemText
                primary={t("till.cashRegisterBalance")}
                secondary={formatCurrency(till.current_cash_register_balance)}
              />
            </ListItem>
          )}
          {till.registration_uuid != null && (
            <ListItem>
              <ListItemText primary={t("till.registrationUUID")} secondary={till.registration_uuid} />
            </ListItem>
          )}
          <ListItem secondaryAction={<Checkbox edge="end" checked={till.session_uuid != null} disabled={true} />}>
            <ListItemText primary={t("till.loggedIn")} />
          </ListItem>
        </List>
      </Paper>
      {till.registration_uuid != null && (
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
              value={encodeTillRegistrationQrCode(config.terminalApiBaseUrl, till.registration_uuid)}
              viewBox={`0 0 256 256`}
            />
          </Box>
        </Paper>
      )}
      <OrderTable orders={orders ?? []} />
      <ConfirmDialog
        title={t("till.forceLogoutUser")}
        body={t("till.forceLogoutUserDescription")}
        show={showForceLogoutDlg}
        onClose={handleConfirmForceLogout}
      />
      <ConfirmDialog
        title={t("till.unregisterTill")}
        body={t("till.unregisterTillDescription")}
        show={showUnregisterTillDlg}
        onClose={handleUnregisterTill}
      />
      <ConfirmDialog
        title={t("till.delete")}
        body={t("till.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTill}
      />
    </DetailLayout>
  );
};
