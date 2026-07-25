import { Loading } from "@stustapay/components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { CustomerRoutes, OrderRoutes, SystemAccountRoutes, TransactionRoutes } from "@/app/routes";
import {
  DetailField,
  DetailLayout,
  DetailNumberField,
  DetailView,
  UserDetailField,
} from "@/components";
import {
  getSystemAccountCollection,
  getTransactionCollection,
  getUserCollection,
} from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const TransactionDetail: React.FC = () => {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();

  const {
    data: transaction,
    isLoading: isTransactionLoading,
    isError: isTransactionError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ transactions: getTransactionCollection(currentNode.id) })
        .where(({ transactions }) => eq(transactions.id, Number(transactionId)))
        .findOne(),
    [currentNode.id, transactionId],
  );
  const { data: accounts, isLoading: isAccountsLoading } = useLiveQuery(
    (q) => q.from({ accounts: getSystemAccountCollection(currentNode.id) }),
    [currentNode.id],
  );
  const { data: conductingUser } = useLiveQuery(
    (q) =>
      q
        .from({ users: getUserCollection(currentNode.id) })
        .where(({ users }) => eq(users.id, transaction?.conducting_user_id ?? -1))
        .findOne(),
    [currentNode.id, transaction?.conducting_user_id],
  );

  if (isTransactionLoading || isAccountsLoading) {
    return <Loading />;
  }

  if (isTransactionError || !transaction || !accounts) {
    navigate(-1);
    return null;
  }

  const getAccount = (accId: number) => accounts.find((account) => account.id === accId);

  const renderAccount = (accId: number) => {
    const account = getAccount(accId);
    if (!account) {
      // not a system account -> assuming it's a customer account
      return t("transaction.customerAccount", { id: accId });
    }
    if (account.comment) {
      return `${account.name} (${account.comment})`;
    }
    return account.name;
  };

  const getAccountLink = (accId: number) => {
    const account = getAccount(accId);
    if (account) {
      return SystemAccountRoutes.detail(accId, currentNode.event_node_id);
    }
    return CustomerRoutes.detail(accId, currentNode.event_node_id);
  };

  return (
    <DetailLayout title={t("transaction.name", { id: transactionId })} routes={TransactionRoutes}>
      <DetailView>
        <DetailField label={t("transaction.id")} value={transaction.id} />
        <DetailField label={t("common.description")} value={transaction.description} />
        <DetailField label={t("order.bookedAt")} value={transaction.booked_at} />
        {transaction.conducting_user_id != null && (
          <UserDetailField
            label={t("transaction.conductingUser")}
            user={conductingUser}
            fallbackNodeId={currentNode.id}
          />
        )}
        {transaction.source_account != null && (
          <DetailField
            label={t("transaction.sourceAccount")}
            value={renderAccount(transaction.source_account)}
            linkTo={getAccountLink(transaction.source_account)}
          />
        )}
        {transaction.target_account != null && (
          <DetailField
            label={t("transaction.targetAccount")}
            value={renderAccount(transaction.target_account)}
            linkTo={getAccountLink(transaction.target_account)}
          />
        )}
        {transaction.order != null && (
          <DetailField
            label={t("transaction.order")}
            value={transaction.order.id}
            linkTo={OrderRoutes.detail(transaction.order.id, currentNode.event_node_id)}
          />
        )}
        <DetailNumberField
          label={t("transaction.amount")}
          value={transaction.amount}
          type="currency"
        />
        <DetailNumberField label={t("transaction.voucherAmount")} value={transaction.vouchers} />
      </DetailView>
    </DetailLayout>
  );
};
