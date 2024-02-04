import { useListSumupTransactionsQuery } from "@/api";
import { SumUpTransactionRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export const SumUpTransactionDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { transactionId } = useParams();
  const { transaction } = useListSumupTransactionsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        transaction: data?.find((transaction) => transaction.id === transactionId),
      }),
    }
  );

  if (transaction === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout title={"SumUpTransaction"} routes={SumUpTransactionRoutes}>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("common.id")} secondary={transaction.id} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("sumup.checkout.amount")}
              secondary={`${transaction.amount.toFixed(2)} ${transaction.currency}`}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.checkout.date")} secondary={transaction.timestamp} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.checkout.payment_type")} secondary={transaction.payment_type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.transaction.card_type")} secondary={transaction.card_type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.transaction.type")} secondary={transaction.type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.checkout.status")} secondary={transaction.status} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("sumup.transaction.product_summary")} secondary={transaction.product_summary} />
          </ListItem>
        </List>
      </Paper>
    </DetailLayout>
  );
};
