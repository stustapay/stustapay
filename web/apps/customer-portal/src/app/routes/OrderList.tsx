import { useGetOrdersWithBonQuery } from "@/api/customerApi";
import {
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  Link,
  Alert,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { Order } from "@stustapay/models";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export const OrderList: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "order" });
  const formatCurrency = useCurrencyFormatter();
  const { data: orders, error: orderError, isLoading: isOrdersLoading } = useGetOrdersWithBonQuery();

  if (isOrdersLoading || (!orders && !orderError)) {
    return <Loading />;
  }

  if (!orders) {
    return <Alert severity="error">{t("loadingError")}</Alert>;
  }

  const orderTotal = (order: Order) => {
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
            <Typography>{t(`orderType.${order.order_type}` as const)}</Typography>
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
                  {t("bookedAt", { date: new Date(order.booked_at).toLocaleString() })}
                </Typography>
                {order.bon_generated && order.bon_output_file && (
                  <Link href={order.bon_output_file} target="_blank" rel="noopener">
                    {t("viewReceipt")}
                  </Link>
                )}
              </div>
              {order.order_type !== "top_up" && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="left">{t("productName")}</TableCell>
                        <TableCell align="right">{t("productPrice")}</TableCell>
                        <TableCell align="right">{t("quantity")}</TableCell>
                        <TableCell align="right">{t("total")}</TableCell>
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
