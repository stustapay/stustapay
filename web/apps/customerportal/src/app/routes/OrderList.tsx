import { OrderWithBon, useGetOrdersQuery } from "@/api";
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

export const OrderList: React.FC = () => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const { data: orders, error: orderError, isLoading: isOrdersLoading } = useGetOrdersQuery();

  if (isOrdersLoading || (!orders && !orderError)) {
    return <Loading />;
  }

  if (!orders) {
    return <Alert severity="error">{t("order.loadingError")}</Alert>;
  }

  const orderTotal = (order: OrderWithBon) => {
    if (order.order_type !== "top_up") {
      return -order.total_price;
    }
    return order.total_price;
  };

  return (
    <>
      {orders.map((order) => (
        <Accordion key={order.id}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${order.id}a-content`}
            id={`panel${order.id}a-header`}
          >
            <Typography>{t(`order.orderType.${order.order_type}` as const)}</Typography>
            <Typography
              style={{
                textAlign: "right",
                flexGrow: 1,
                marginRight: "0.5em",
                color: order.order_type === "top_up" ? "green" : "inherit",
              }}
            >
              {formatCurrency(orderTotal(order))}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div style={{ width: "100%" }}>
              <div style={{ marginBottom: "0.5em" }}>
                <Typography variant="subtitle2">
                  {t("order.bookedAt", { date: new Date(order.booked_at).toLocaleString() })}
                </Typography>
                {order.bon_generated && order.bon_output_file && (
                  <Link href={order.bon_output_file} target="_blank" rel="noopener">
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
