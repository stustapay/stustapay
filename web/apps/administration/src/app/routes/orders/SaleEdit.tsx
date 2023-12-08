import { useGetOrderQuery } from "@/api";
import { ListItemLink } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Alert, List, ListItem, ListItemText, Paper, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { LineItemEdit } from "./LineItemEdit";
import { withPrivilegeGuard } from "@/app/layout";

export const SaleEdit: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { orderId } = useParams();
  const navigate = useNavigate();

  const {
    data: order,
    error,
    isLoading: isOrderLoading,
  } = useGetOrderQuery({ nodeId: currentNode.id, orderId: Number(orderId) });

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
});
