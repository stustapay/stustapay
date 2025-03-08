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
import {
  DetailBoolField,
  DetailField,
  DetailLayout,
  DetailNumberField,
  DetailView,
  EditableListItem,
} from "@/components";
import { OrderTable } from "@/components/features";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";
import { Edit as EditIcon, RemoveCircle as RemoveCircleIcon } from "@mui/icons-material";
import { Alert, Button, Grid, IconButton, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AccountTagHistoryTable } from "../accounts/components/AccountTagHistoryTable";
import { EditAccountBalanceModal } from "../accounts/components/EditAccountBalanceModal";
import { EditAccountVoucherAmountModal } from "../accounts/components/EditAccountVoucherAmountModal";
import { LayoutAction } from "@/components/layouts/types";

const PayoutDetails: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
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
        <DetailView sx={{ height: "100%" }}>
          {customer.payout_export === false && (
            <Alert severity="info" action={<Button onClick={onClickAllowPayout}>{t("customer.allowPayout")}</Button>}>
              {t("customer.payoutExportPrevented")}
            </Alert>
          )}
          <DetailBoolField label={t("customer.hasEnteredInfo")} value={customer.has_entered_info} />
          <DetailField label={t("customer.bankAccountHolder")} value={printMaybeNull(customer.account_name)} />
          <DetailField label={t("customer.iban")} value={printMaybeNull(customer.iban)} />
          <DetailField label={t("common.email")} value={printMaybeNull(customer.email)} />
          <DetailBoolField label={t("customer.donateAll")} value={customer.donate_all} />
          <DetailNumberField label={t("customer.donation")} type="currency" value={customer.donation} />
        </DetailView>
        <DetailView>
          {customer.payout ? (
            <>
              <DetailField label={t("customer.detailsInPayoutRun")} />
              <DetailField
                label={t("customer.payoutRun")}
                value={customer.payout.payout_run_id}
                linkTo={PayoutRunRoutes.detail(customer.payout.payout_run_id)}
              />
              <DetailField label={t("customer.iban")} value={printMaybeNull(customer.payout.iban)} />
              <DetailField label={t("common.email")} value={printMaybeNull(customer.payout.email)} />
              <DetailNumberField label={t("customer.donation")} type="currency" value={customer.payout.donation} />
              <DetailNumberField label={t("customer.payoutAmount")} type="currency" value={customer.payout.amount} />
            </>
          ) : (
            <Alert severity="info">{t("customer.noPayoutRunAssigned")}</Alert>
          )}
        </DetailView>
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
          <DetailView sx={{ height: "100%" }}>
            <DetailField label={t("account.id")} value={customer.id} />
            <DetailField label={t("account.type")} value={customer.type} />
            <DetailField
              label={t("account.user_tag_uid")}
              value={formatUserTagUid(customer.user_tag_uid_hex)}
              linkTo={UserTagRoutes.detail(customer.user_tag_id)}
            />
            <DetailField label={t("account.name")} value={customer.name} />
            <EditableListItem
              label={t("account.comment")}
              value={customer.comment ?? ""}
              onChange={handleUpdateComment}
            />
            <DetailNumberField label={t("account.balance")} type="currency" value={customer.balance} />
            <DetailField
              label={t("account.vouchers")}
              value={customer.vouchers}
              secondaryAction={
                <IconButton color="secondary" onClick={() => setVoucherModalOpen(true)}>
                  <EditIcon />
                </IconButton>
              }
            />
          </DetailView>
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
      <OrderTable orders={orders} showCashierColumn showTillColumn />
    </DetailLayout>
  );
});
