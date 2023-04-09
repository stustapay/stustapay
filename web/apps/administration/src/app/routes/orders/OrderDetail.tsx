import * as React from "react";
import { Paper, ListItem, ListItemText, List } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { selectOrderById, useGetOrderByIdQuery } from "@api";
import { Loading } from "@components/Loading";
import { LineItemTable } from "@components/LineItemTable";

export const OrderDetail: React.FC = () => {
  const { t } = useTranslation(["orders", "common"]);
  const { orderId } = useParams();
  const navigate = useNavigate();

  const {
    order,
    error,
    isLoading: isOrderLoading,
  } = useGetOrderByIdQuery(Number(orderId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      order: data ? selectOrderById(data, Number(orderId)) : undefined,
    }),
  });

  if (isOrderLoading) {
    return <Loading />;
  }

  if (error || !order) {
    navigate(-1);
    return null;
  }

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("order.name", { id: orderId })} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("order.id")} secondary={order.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("order.itemCount")} secondary={order.item_count} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("order.paymentMethod")} secondary={order.payment_method} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("order.type")} secondary={order.order_type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("order.bookedAt")} secondary={order.booked_at} />
          </ListItem>
        </List>
      </Paper>
      <LineItemTable lineItems={order.line_items} />
    </>
  );
};
