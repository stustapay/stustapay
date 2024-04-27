import { withPrivilegeGuard } from "@/app/layout";
import { Privilege, formatUserTagUid } from "@stustapay/models";
import {
  selectOrderAll,
  useDisableAccountMutation,
  useGetCustomerQuery,
  useListOrdersQuery,
  useUpdateAccountCommentMutation,
} from "@/api";
import { AccountRoutes, PayoutRunRoutes, UserTagRoutes } from "@/app/routes";
import { DetailLayout, EditableListItem, ListItemLink } from "@/components";
import { OrderTable } from "@/components/features";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Edit as EditIcon, RemoveCircle as RemoveCircleIcon } from "@mui/icons-material";
import { Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AccountTagHistoryTable } from "../accounts/components/AccountTagHistoryTable";
import { EditAccountBalanceModal } from "../accounts/components/EditAccountBalanceModal";
import { EditAccountVoucherAmountModal } from "../accounts/components/EditAccountVoucherAmountModal";

export const CustomerDetail = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: customer,
    error,
    isLoading: isAccountLoading,
  } = useGetCustomerQuery({ nodeId: currentNode.id, customerId: Number(customerId) });

  const formatCurrency = useCurrencyFormatter();
  const [disableAccount] = useDisableAccountMutation();
  const [updateComment] = useUpdateAccountCommentMutation();

  const [balanceModalOpen, setBalanceModalOpen] = React.useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = React.useState(false);

  const {
    orders,
    error: orderError,
    isLoading: isOrdersLoading,
  } = useListOrdersQuery(
    { nodeId: currentNode.id, customerAccountId: Number(customerId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );

  if (isAccountLoading || (!customer && !error)) {
    return <Loading />;
  }

  if (error || !customer) {
    toast.error("Error loading account");
    navigate(AccountRoutes.list());
    return null;
  }

  if (isOrdersLoading || (!orders && !orderError)) {
    return <Loading />;
  }

  if (orderError || !orders) {
    toast.error("Error loading account");
    navigate(-1);
    return null;
  }

  const handleDisableAccount = () => {
    disableAccount({ nodeId: currentNode.id, accountId: customer.id })
      .unwrap()
      .then(() => {
        toast.success(t("account.disableSuccess"));
      })
      .catch((e) => {
        console.error("Error while disabling account", e);
        toast.error(`Error while disabling account`);
      });
  };

  const handleUpdateComment = (newComment: string) => {
    updateComment({
      nodeId: currentNode.id,
      accountId: customer.id,
      updateAccountCommentPayload: { comment: newComment },
    });
  };

  return (
    <DetailLayout
      title={`Customer Account ${customer.id}`}
      routes={AccountRoutes}
      actions={[
        { label: t("account.disable"), onClick: handleDisableAccount, color: "error", icon: <RemoveCircleIcon /> },
      ]}
    >
      <Grid
        container
        spacing={1}
        display="grid"
        alignItems="stretch"
        gridTemplateColumns={`repeat(${customer.payout_export ? 2 : 1}, auto)`}
      >
        <Grid item>
          <Paper sx={{ height: "100%" }}>
            <List>
              <ListItem>
                <ListItemText primary={t("account.id")} secondary={customer.id} />
              </ListItem>
              <ListItem>
                <ListItemText primary={t("account.type")} secondary={customer.type} />
              </ListItem>
              <ListItemLink to={UserTagRoutes.detail(customer.user_tag_id)}>
                <ListItemText
                  primary={t("account.user_tag_uid")}
                  secondary={formatUserTagUid(customer.user_tag_uid_hex)}
                />
              </ListItemLink>
              <ListItem>
                <ListItemText primary={t("account.name")} secondary={customer.name} />
              </ListItem>
              <EditableListItem
                label={t("account.comment")}
                value={customer.comment ?? ""}
                onChange={handleUpdateComment}
              />
              <ListItem>
                <ListItemText primary={t("account.balance")} secondary={formatCurrency(customer.balance)} />
                {/* {isAdmin && (
              <ListItemSecondaryAction>
                <IconButton color="primary" onClick={() => setBalanceModalOpen(true)}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )} */}
              </ListItem>
              <ListItem>
                <ListItemText primary={t("account.vouchers")} secondary={customer.vouchers} />
                <ListItemSecondaryAction>
                  <IconButton color="primary" onClick={() => setVoucherModalOpen(true)}>
                    <EditIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>
        {customer.payout_export && (
          <Grid item>
            <Paper sx={{ height: "100%" }}>
              <List>
                <ListItem>
                  <ListItemText primary={t("customer.bankAccountHolder")} secondary={customer.account_name} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={t("customer.iban")} secondary={customer.iban} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={t("common.email")} secondary={customer.email} />
                </ListItem>
                <ListItem>
                  <ListItemText primary={t("customer.donation")} secondary={formatCurrency(customer.donation)} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={t("customer.payoutRun")}
                    secondary={
                      customer.payout_run_id != null ? (
                        <RouterLink to={PayoutRunRoutes.detail(customer.payout_run_id)}>
                          {customer.payout_run_id}
                        </RouterLink>
                      ) : (
                        t("customer.noPayoutRunAssigned")
                      )
                    }
                  />
                </ListItem>
                {customer.payout_error && (
                  <ListItem>
                    <ListItemText primary={t("customer.payoutRunError")} secondary={customer.payout_error} />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
      {customer.tag_history.length > 0 && <AccountTagHistoryTable history={customer.tag_history} />}
      <EditAccountBalanceModal
        account={customer}
        open={balanceModalOpen}
        handleClose={() => setBalanceModalOpen(false)}
      />
      <EditAccountVoucherAmountModal
        account={customer}
        open={voucherModalOpen}
        handleClose={() => setVoucherModalOpen(false)}
      />
      <OrderTable orders={orders} />
    </DetailLayout>
  );
});
