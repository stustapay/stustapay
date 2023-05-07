import { Link as RouterLink } from "react-router-dom";
import { useGetCustomerQuery, useGetOrdersWithBonQuery } from "@/api/customerApi";
import { Card, Accordion, AccordionSummary, Typography, AccordionDetails, Link, Alert } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation, Trans } from "react-i18next";
import { OrderType } from "@stustapay/models";

export const Index: React.FC = () => {
  const { t } = useTranslation(["common"]);

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const navigate = useNavigate();

  const { data: orders, error: orderError, isLoading: isOrdersLoading } = useGetOrdersWithBonQuery();

  const ordertype2uiname: { [key in OrderType]: string } = {
    sale: t("Purchase"),
    cancel_sale: t("Canceled Purchase"),
    top_up: t("Top Up"),
    pay_out: t("Payout"),
    ticket: t("Ticket Purchase"),
  };

  const currency_symbol = "€";

  if (isCustomerLoading || isOrdersLoading || (!customer && !customerError) || (!orders && !orderError)) {
    return <Loading />;
  }

  if (customerError || !customer || orderError || !orders) {
    toast.error(t("Error loading customer"));
    navigate(-1);
    return null;
  }
  console.log(orders[0].line_items[0]);

  // TODO: depending on the order_type we want to show different stuff
  // we also might want to show the balance of the account after each order

  const listItems = orders.map((order) => (
    <Accordion key={order.id}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel${order.id}a-content`}
        id={`panel${order.id}a-header`}
      >
        <Typography>{ordertype2uiname[order.order_type]}</Typography>
        <Typography
          style={{
            textAlign: "right",
            flexGrow: 1,
            marginRight: "0.5em",
            color: order.order_type === "top_up" ? "green" : "inherit",
          }}
        >
          {-order.total_price} {currency_symbol}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div style={{ width: "100%" }}>
          <div style={{ marginBottom: "0.5em" }}>
            <Typography variant="subtitle2">Booked at: {new Date(order.booked_at).toLocaleString()}</Typography>
            {order.bon_generated && order.bon_output_file && (
              <Link href={order.bon_output_file} target="_blank" rel="noopener">
                View receipt
              </Link>
            )}
          </div>
          {order.order_type === "sale" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>{t("Product Name")}</th>
                  <th style={{ textAlign: "right" }}>{t("Product Price")}</th>
                  <th style={{ textAlign: "right" }}>{t("Quantity")}</th>
                  <th style={{ textAlign: "right" }}>{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {order.line_items.map((item) => (
                  <tr>
                    <td style={{ textAlign: "left" }}>{item.product.name}</td>
                    <td style={{ textAlign: "right" }}>
                      {item.product_price.toFixed(2)} {currency_symbol}
                    </td>
                    <td style={{ textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>
                      {(item.total_price * item.quantity).toFixed(2)} {currency_symbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AccordionDetails>
    </Accordion>
  ));

  const currentBalance = customer.balance;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* // TODO: use paper as it might look nices */}
      <Card
        variant="outlined"
        style={{
          justifyContent: "center",
          textAlign: "center",
          fontSize: "2.5em",
          marginBottom: "1em",
          border: "none",
          marginTop: "1em",
        }}
      >
        <span>
          {currentBalance.toFixed(2)} {currency_symbol}
        </span>
      </Card>
      <div style={{ width: "90%", maxWidth: "800px" }}>
        <Alert severity="info" variant="outlined" style={{ marginBottom: "1em", width: "100%" }}>
          <Trans>
            To get your payout after the festival, please&nbsp;
            <Link component={RouterLink} to="/payout-info">
              enter your bank account details here
            </Link>
            .
          </Trans>
        </Alert>
        {listItems}
      </div>
    </div>
  );
};
