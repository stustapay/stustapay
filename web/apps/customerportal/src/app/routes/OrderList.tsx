import { OrderWithBon, OrderWithBonRead, PayoutTransaction, useGetOrdersQuery, useGetPayoutTransactionsQuery } from "@/api";
import { useDownloadBon } from "@/api/useDownloadBon";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

const normalizeOrderPrice = (order: OrderWithBon) => {
  if (order.order_type !== "top_up") {
    return -order.total_price;
  }
  return order.total_price;
};

export const OrderList: React.FC = () => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const { data: orders, error: orderError, isLoading: isOrdersLoading } = useGetOrdersQuery();
  const { data: payoutTransactions, error: payoutTransactionsError, isLoading: isPayoutTransactionsLoading } = useGetPayoutTransactionsQuery();
  const downloadBon = useDownloadBon();

  if (isOrdersLoading || (!orders && !orderError) || isPayoutTransactionsLoading || (!payoutTransactions && !payoutTransactionsError)) {
    return <Loading />;
  }

  if (!orders || !payoutTransactions) {
    return <Alert severity="error">{t("order.loadingError")}</Alert>;
  }

  const formatOrderTotal = (order: OrderWithBonRead) => {
    let price = normalizeOrderPrice(order);
    if (order.order_type === "ticket") {
      price = order.line_items
        .filter((lineItem) => lineItem.product.type === "topup")
        .reduce((acc, li) => li.total_price + acc, 0);
      if (price <= 0) {
        return;
      }
    }
    return (
      <Typography
        style={{
          textAlign: "right",
          flexGrow: 1,
          marginRight: "0.5em",
          color: price >= 0 ? "green" : "inherit",
        }}
      >
        {formatCurrency(price)}
      </Typography>
    );
  };

  const getTransactionName = (transaction: PayoutTransaction) => {
    if (transaction.target_account_type === "cash_exit" || transaction.target_account_type === "sepa_exit") {
      return t("transaction.sepaExit");
    } else if (transaction.target_account_type === "donation_exit") {
      return t("transaction.donationExit");
    } else {
      return "Payout";
    }

  }

  const payout_transactions = (
    payoutTransactions.filter((payoutTransaction) => payoutTransaction.amount > 0).map((payoutTransaction) => (
    <Accordion key={`transaction-${payoutTransaction.transaction_id}`}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography>{getTransactionName(payoutTransaction)}</Typography>
          <Typography
            style={{
              textAlign: "right",
              flexGrow: 1,
              marginRight: "0.5em",
              color: "inherit",
            }}
          >
            {formatCurrency(-payoutTransaction.amount)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2">
            {t("order.bookedAt", { date: new Date(payoutTransaction.booked_at).toLocaleString() })}
          </Typography>
        </AccordionDetails>
      </Accordion>
      ))
  );


  return (
    <>
      {payout_transactions}
      {orders.map((order) => (
        <Accordion key={order.id}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${order.id}a-content`}
            id={`panel${order.id}a-header`}
          >
            <Typography>{t(`order.orderType.${order.order_type}` as const)}</Typography>
            {formatOrderTotal(order)}
          </AccordionSummary>
          <AccordionDetails>
            <div style={{ width: "100%" }}>
              <div style={{ marginBottom: "0.5em" }}>
                <Typography variant="subtitle2">
                  {t("order.bookedAt", { date: new Date(order.booked_at).toLocaleString() })}
                </Typography>
                {order.bon_generated && (
                  <Link component="button" onClick={() => downloadBon(order.id)}>
                    {t("order.viewReceipt")}
                  </Link>
                )}
              </div>
              {order.order_type !== "top_up" && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="left">{t("order.productName")}</TableCell>
                        <TableCell align="right">{t("order.productPrice")}</TableCell>
                        <TableCell align="right">{t("order.quantity")}</TableCell>
                        <TableCell align="right">{t("order.total")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.line_items.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell align="left">{item.product.name}</TableCell>
                          <TableCell align="right">{formatCurrency(item.product_price)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell align="left" colSpan={3} sx={{ fontWeight: "bold" }}>
                          {t("order.total")}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(order.total_price)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
};
