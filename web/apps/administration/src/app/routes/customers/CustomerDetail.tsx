import { withPrivilegeGuard } from "@/app/layout";
import { Privilege, formatUserTagUid } from "@stustapay/models";
import {
  Customer,
  selectOrderAll,
  useAllowCustomerPayoutMutation,
  useDisableAccountMutation,
  useGetCustomerQuery,
  useListOrdersQuery,
  usePreventCustomerPayoutMutation,
  useUpdateAccountCommentMutation,
} from "@/api";
import { AccountRoutes, PayoutRunRoutes, UserTagRoutes } from "@/app/routes";
import { DetailLayout, EditableListItem, ListItemLink } from "@/components";
import { OrderTable } from "@/components/features";
import { useCurrencyFormatter, useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";
import { Edit as EditIcon, RemoveCircle as RemoveCircleIcon } from "@mui/icons-material";
import {
  Alert,
  Button,
  Checkbox,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
} from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AccountTagHistoryTable } from "../accounts/components/AccountTagHistoryTable";
import { EditAccountBalanceModal } from "../accounts/components/EditAccountBalanceModal";
import { EditAccountVoucherAmountModal } from "../accounts/components/EditAccountVoucherAmountModal";
import { LayoutAction } from "@/components/layouts/types";

const PayoutDetails: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const [allowPayout] = useAllowCustomerPayoutMutation();

  const printMaybeNull = (value?: string | null) => {
    if (value == null || value === "") {
      return t("common.notSet");
    }
    return value;
  };

  const onClickAllowPayout = () => {
    allowPayout({ customerId: customer.id, nodeId: currentNode.id }).catch(() => {
      toast.error("Error while allowing customer payout");
    });
  };

  return (
    <Grid item>
      <Stack spacing={2}>
        <Paper sx={{ height: "100%" }}>
          {customer.payout_export === false && (
            <Alert severity="info" action={<Button onClick={onClickAllowPayout}>{t("customer.allowPayout")}</Button>}>
              {t("customer.payoutExportPrevented")}
            </Alert>
          )}
          <List>
            <ListItem secondaryAction={<Checkbox edge="end" checked={customer.has_entered_info} disabled={true} />}>
              <ListItemText primary={t("customer.hasEnteredInfo")} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("customer.bankAccountHolder")}
                secondary={printMaybeNull(customer.account_name)}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("customer.iban")} secondary={printMaybeNull(customer.iban)} />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("common.email")} secondary={printMaybeNull(customer.email)} />
            </ListItem>
            <ListItem secondaryAction={<Checkbox edge="end" checked={customer.donate_all} disabled={true} />}>
              <ListItemText primary={t("customer.donateAll")} />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("customer.donation")} secondary={formatCurrency(customer.donation)} />
            </ListItem>
          </List>
        </Paper>
        <Paper>
          {customer.payout ? (
            <List>
              <ListItem>
                <ListItemText primary={t("customer.detailsInPayoutRun")} />
              </ListItem>
              <ListItemLink to={PayoutRunRoutes.detail(customer.payout.payout_run_id)}>
                <ListItemText primary={t("customer.payoutRun")} secondary={customer.payout.payout_run_id} />
              </ListItemLink>
              <ListItem>
                <ListItemText primary={t("customer.iban")} secondary={printMaybeNull(customer.payout.iban)} />
              </ListItem>
              <ListItem>
                <ListItemText primary={t("common.email")} secondary={printMaybeNull(customer.payout.email)} />
              </ListItem>
              <ListItem>
                <ListItemText primary={t("customer.donation")} secondary={formatCurrency(customer.payout.donation)} />
              </ListItem>
              <ListItem>
                <ListItemText primary={t("customer.payoutAmount")} secondary={formatCurrency(customer.payout.amount)} />
              </ListItem>
            </List>
          ) : (
            <Alert severity="info">{t("customer.noPayoutRunAssigned")}</Alert>
          )}
        </Paper>
      </Stack>
    </Grid>
  );
};

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
  const canManagePayoutsAtNode = useCurrentUserHasPrivilegeAtNode(PayoutRunRoutes.privilege);

  const [allowPayout] = useAllowCustomerPayoutMutation();
  const [preventPayout] = usePreventCustomerPayoutMutation();

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

  const handleAllowPayout = () => {
    allowPayout({ customerId: customer.id, nodeId: currentNode.id }).catch(() => {
      toast.error("Error while allowing customer payout");
    });
  };

  const handlePreventPayout = () => {
    preventPayout({ customerId: customer.id, nodeId: currentNode.id }).catch(() => {
      toast.error("Error while allowing customer payout");
    });
  };

  const actions: LayoutAction[] = [
    { label: t("account.disable"), onClick: handleDisableAccount, color: "error", icon: <RemoveCircleIcon /> },
  ];

  if (canManagePayoutsAtNode(currentNode.id) && customer.payout == null) {
    if (customer.payout_export !== false) {
      actions.splice(0, 0, {
        label: t("customer.preventPayout"),
        onClick: handlePreventPayout,
        color: "error",
      });
    } else {
      actions.splice(0, 0, {
        label: t("customer.allowPayout"),
        onClick: handleAllowPayout,
        color: "error",
      });
    }
  }

  return (
    <DetailLayout title={`Customer Account ${customer.id}`} routes={AccountRoutes} actions={actions}>
      <Grid container spacing={1} display="grid" alignItems="stretch" gridTemplateColumns="1fr 1fr">
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
        <PayoutDetails customer={customer} />
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
