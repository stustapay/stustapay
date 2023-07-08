import * as React from "react";
import { Alert, List, ListItem, ListItemText, Paper, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { selectOrderById, useGetOrderByIdQuery } from "@api";
import { Loading } from "@stustapay/components";
import { ListItemLink } from "@components";
import { formatUserTagUid } from "@stustapay/models";
import { LineItemEdit } from "./LineItemEdit";

export const SaleEdit: React.FC = () => {
  const { t } = useTranslation();
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
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={t("order.name", { id: orderId })} />
        </ListItem>
      </Paper>
      <Alert severity="warning">{t("order.editOrderInfo")}</Alert>
      <Paper>
        <LineItemEdit order={order} />
      </Paper>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("order.id")} secondary={order.id} />
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
          {order.customer_account_id != null && (
            <ListItemLink to={`/customer-accounts/${order.customer_account_id}`}>
              <ListItemText primary={t("order.customerAccountId")} secondary={order.customer_account_id} />
            </ListItemLink>
          )}
          {order.customer_tag_uid_hex != null && (
            <ListItemLink to={`/user-tags/${order.customer_tag_uid_hex}`}>
              <ListItemText
                primary={t("order.customerTagUid")}
                secondary={formatUserTagUid(order.customer_tag_uid_hex)}
              />
            </ListItemLink>
          )}
        </List>
      </Paper>
    </Stack>
  );
};
