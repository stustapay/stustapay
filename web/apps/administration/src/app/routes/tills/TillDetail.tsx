import { Box, Button, Checkbox, IconButton, List, ListItem, ListItemText, Paper, Stack, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink, ListItemLink, OrderTable } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Logout as LogoutIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
} from "@api";
import { Loading } from "@stustapay/components";
import QRCode from "react-qr-code";
import { encodeTillRegistrationQrCode } from "@core";
import { config } from "@api/common";
import { toast } from "react-toastify";
import { getUserName } from "@stustapay/models";
import { useCurrencyFormatter } from "@hooks";

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
    return <Navigate to="/tills" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTill({ tillId: Number(tillId) }).then(() => navigate("/tills"));
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
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <Tooltip title={t("edit")}>
                <span>
                  <IconButtonLink to={`/tills/${tillId}/edit`} color="primary" sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButtonLink>
                </span>
              </Tooltip>
              {till.session_uuid != null && (
                <Tooltip title={t("till.logout")}>
                  <IconButton onClick={openUnregisterTillDialog} color="warning">
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t("delete")}>
                <IconButton onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={till.name} />
        </ListItem>
      </Paper>
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
          <ListItemLink to={`/till-profiles/${till.active_profile_id}`}>
            <ListItemText primary={t("till.profile")} secondary={renderProfile(till.active_profile_id)} />
          </ListItemLink>
          {till.active_user_id != null && (
            <>
              <ListItemLink to={`/cashiers/${till.active_user_id}`}>
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
    </Stack>
  );
};
