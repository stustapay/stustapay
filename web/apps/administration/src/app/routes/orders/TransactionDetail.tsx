import {
  selectAccountById,
  selectUserById,
  useGetTransactionQuery,
  useListSystemAccountsQuery,
  useListUsersQuery,
} from "@/api";
import { AccountRoutes, OrderRoutes, TransactionRoutes, UserRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export const TransactionDetail: React.FC = () => {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();

  const {
    data: transaction,
    error,
    isLoading: isTransactionLoading,
  } = useGetTransactionQuery({ nodeId: currentNode.id, transactionId: Number(transactionId) });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: accounts, isLoading: isAccountsLoading } = useListSystemAccountsQuery({ nodeId: currentNode.id });

  if (isTransactionLoading || isUsersLoading || isAccountsLoading) {
    return <Loading />;
  }

  if (error || !transaction || !users || !accounts) {
    navigate(-1);
    return null;
  }
  const user =
    transaction.conducting_user_id != null ? selectUserById(users, transaction.conducting_user_id) : undefined;

  const renderAccount = (accId: number) => {
    const account = selectAccountById(accounts, accId);
    if (!account) {
      // not a system account -> assuming it's a customer account
      return t("transaction.customerAccount", { id: accId });
    }
    if (account.comment) {
      return `${account.name} (${account.comment})`;
    }
    return account.name;
  };

  return (
    <DetailLayout title={t("transaction.name", { id: transactionId })} routes={TransactionRoutes}>
      <DetailView>
        <DetailField label={t("transaction.id")} value={transaction.id} />
        <DetailField label={t("common.description")} value={transaction.description} />
        <DetailField label={t("order.bookedAt")} value={transaction.booked_at} />
        {user && (
          <DetailField
            label={t("transaction.conductingUser")}
            value={getUserName(user)}
            linkTo={UserRoutes.detail(user.id, user.node_id)}
          />
        )}
        {transaction.source_account != null && (
          <DetailField
            label={t("transaction.sourceAccount")}
            value={renderAccount(transaction.source_account)}
            linkTo={AccountRoutes.detail(transaction.source_account, currentNode.event_node_id)}
          />
        )}
        {transaction.target_account != null && (
          <DetailField
            label={t("transaction.targetAccount")}
            value={renderAccount(transaction.target_account)}
            linkTo={AccountRoutes.detail(transaction.target_account, currentNode.event_node_id)}
          />
        )}
        {transaction.order != null && (
          <DetailField
            label={t("transaction.order")}
            value={transaction.order.id}
            linkTo={OrderRoutes.detail(transaction.order.id, currentNode.event_node_id)}
          />
        )}
        <DetailNumberField label={t("transaction.amount")} value={transaction.amount} type="currency" />
        <DetailNumberField label={t("transaction.voucherAmount")} value={transaction.vouchers} />
      </DetailView>
    </DetailLayout>
  );
};
