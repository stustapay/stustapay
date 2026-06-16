import {
  OrderWithBon,
  OrderWithBonRead,
  PayoutTransaction,
  useGetOrdersQuery,
  useGetPayoutTransactionsQuery,
} from "@/api";
import { useCurrencyFormatter } from "@/hooks";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
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
import { Link as RouterLink } from "react-router-dom";

const accordionSx = {
  mb: 1.5,
  overflow: "hidden",
  borderRadius: 3,
  border: "1px solid var(--portal-card-border)",
  backgroundColor: "var(--portal-card-bg)",
  color: "var(--portal-card-text)",
  boxShadow: "var(--shadow-soft)",
  "&::before": {
    display: "none",
  },
};

const accordionSummarySx = {
  minHeight: 72,
  "& .MuiAccordionSummary-content": {
    alignItems: "center",
    my: 1.5,
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    color: "var(--portal-card-text)",
  },
};

const amountTypographySx = {
  textAlign: "right",
  flexGrow: 1,
  marginRight: "0.5em",
  fontWeight: 700,
};

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
  const {
    data: payoutTransactions,
    error: payoutTransactionsError,
    isLoading: isPayoutTransactionsLoading,
  } = useGetPayoutTransactionsQuery();

  if (
    isOrdersLoading ||
    (!orders && !orderError) ||
    isPayoutTransactionsLoading ||
    (!payoutTransactions && !payoutTransactionsError)
  ) {
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
        sx={{
          ...amountTypographySx,
          color: price >= 0 ? "var(--portal-success)" : "var(--portal-card-text)",
        }}
      >
        {formatCurrency(price)}
      </Typography>
    );
  };

  const getTransactionName = (transaction: PayoutTransaction) => {
    if (transaction.target_account_type === "cash_exit") {
      return t("transaction.cashExit");
    } else if (transaction.target_account_type === "sepa_exit") {
      return t("transaction.sepaExit");
    } else if (transaction.target_account_type === "donation_exit") {
      return t("transaction.donationExit");
    } else {
      return "Payout";
    }
  };

  const payout_transactions = payoutTransactions
    .filter((payoutTransaction) => payoutTransaction.amount > 0)
    .map((payoutTransaction) => (
      <Accordion key={`transaction-${payoutTransaction.transaction_id}`} sx={accordionSx}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
          sx={accordionSummarySx}
        >
          <Typography>{getTransactionName(payoutTransaction)}</Typography>
          <Typography sx={{ ...amountTypographySx, color: "var(--portal-card-text)" }}>
            {formatCurrency(-payoutTransaction.amount)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ color: "var(--portal-card-muted)" }}>
          <Typography variant="subtitle2" color="inherit">
            {t("order.bookedAt", { date: new Date(payoutTransaction.booked_at).toLocaleString() })}
          </Typography>
        </AccordionDetails>
      </Accordion>
    ));

  return (
    <Box
      sx={{
        maxHeight: { xs: "55vh", md: "60vh" },
        overflowY: "auto",
        pr: 0.5,
      }}
    >
      {payout_transactions}
      {orders.map((order) => (
        <Accordion key={order.id} sx={accordionSx}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${order.id}a-content`}
            id={`panel${order.id}a-header`}
            sx={accordionSummarySx}
          >
            <Typography>{t(`order.orderType.${order.order_type}` as const)}</Typography>
            {formatOrderTotal(order)}
          </AccordionSummary>
          <AccordionDetails sx={{ color: "var(--portal-card-text)" }}>
            <div style={{ width: "100%" }}>
              <div style={{ marginBottom: "0.5em" }}>
                <Typography variant="subtitle2" sx={{ color: "var(--portal-card-muted)" }}>
                  {t("order.bookedAt", { date: new Date(order.booked_at).toLocaleString() })}
                </Typography>
                {order.shared_topup_contributor_name && (
                  <Typography variant="subtitle2" sx={{ color: "var(--portal-card-muted)" }}>
                    {t("order.sharedTopupContributor", { name: order.shared_topup_contributor_name })}
                  </Typography>
                )}
                {order.bon_generated && (
                  <Link component={RouterLink} target="_blank" to={`/bon/${order.uuid}`} sx={{ color: "var(--primary-main)" }}>
                    {t("order.viewReceipt")}
                  </Link>
                )}
              </div>
              {order.order_type !== "top_up" && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="left" sx={{ color: "var(--portal-card-muted)" }}>
                          {t("order.productName")}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--portal-card-muted)" }}>
                          {t("order.productPrice")}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--portal-card-muted)" }}>
                          {t("order.quantity")}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--portal-card-muted)" }}>
                          {t("order.total")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.line_items.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell align="left" sx={{ color: "var(--portal-card-text)" }}>
                            {item.product.name}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "var(--portal-card-text)" }}>
                            {formatCurrency(item.product_price)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "var(--portal-card-text)" }}>
                            {item.quantity}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "var(--portal-card-text)" }}>
                            {formatCurrency(item.total_price)}
                          </TableCell>
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
    </Box>
  );
};
