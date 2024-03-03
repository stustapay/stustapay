import {
  selectOrderAll,
  selectTerminalById,
  selectTillProfileById,
  selectUserById,
  useDeleteTillMutation,
  useForceLogoutUserMutation,
  useGetTillQuery,
  useListOrdersByTillQuery,
  useListTerminalsQuery,
  useListTillProfilesQuery,
  useListUsersQuery,
} from "@/api";
import { CashierRoutes, TerminalRoutes, TillProfileRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListItemLink } from "@/components";
import { OrderTable } from "@/components/features";
import { DetailLayout } from "@/components/layouts";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Button, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const TillDetail: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const [showForceLogoutDlg, setShowForceLogoutDlg] = React.useState(false);

  const [forceLogoutUser] = useForceLogoutUserMutation();
  const [deleteTill] = useDeleteTillMutation();
  const { data: till, error: tillError } = useGetTillQuery({ nodeId: currentNode.id, tillId: Number(tillId) });
  const { orders, error: orderError } = useListOrdersByTillQuery(
    { nodeId: currentNode.id, tillId: Number(tillId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );
  const { data: profiles, error: profileError } = useListTillProfilesQuery({ nodeId: currentNode.id });
  const { data: users, error: userError } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: terminals, error: terminalError } = useListTerminalsQuery({ nodeId: currentNode.id });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (tillError || orderError || userError || profileError || terminalError) {
    toast.error("Error loading tills or orders");
    return <Navigate to={TillRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTill({ nodeId: currentNode.id, tillId: Number(tillId) }).then(() => navigate(TillRoutes.list()));
    }
    setShowConfirmDelete(false);
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

  const renderTerminal = (id?: number) => {
    if (!terminals || id == null) {
      return "";
    }

    const terminal = selectTerminalById(terminals, id);
    if (!terminal) {
      return "";
    }

    return terminal.name;
  };

  const openConfirmLogoutDialog = () => {
    setShowForceLogoutDlg(true);
  };

  const handleConfirmForceLogout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      forceLogoutUser({ nodeId: currentNode.id, tillId: Number(tillId) });
    }
    setShowForceLogoutDlg(false);
  };

  return (
    <DetailLayout
      title={till.name}
      routes={TillRoutes}
      actions={[
        { label: t("edit"), onClick: () => navigate(TillRoutes.edit(tillId)), color: "primary", icon: <EditIcon /> },
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
          {till.terminal_id != null && (
            <ListItemLink to={TerminalRoutes.detail(till.terminal_id)}>
              <ListItemText primary={t("till.terminal")} secondary={renderTerminal(till.terminal_id)} />
            </ListItemLink>
          )}
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
        </List>
      </Paper>
      <OrderTable orders={orders ?? []} />
      <ConfirmDialog
        title={t("till.forceLogoutUser")}
        body={t("till.forceLogoutUserDescription")}
        show={showForceLogoutDlg}
        onClose={handleConfirmForceLogout}
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
