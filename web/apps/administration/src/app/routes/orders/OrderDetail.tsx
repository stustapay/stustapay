import { useCancelOrderMutation, useGetOrderQuery } from "@/api";
import { OrderRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, DetailLayout, ListItemLink } from "@/components";
import { LineItemTable } from "@/components/LineItemTable";
import { useCurrentNode } from "@/hooks";
import { Cancel as CancelIcon, Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const OrderDetail: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();
  const [showCancelOrderConfirm, setShowCancelOrderConfirm] = React.useState(false);

  const [cancelSale] = useCancelOrderMutation();

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

  const openConfirmCancelOrderDialog = () => setShowCancelOrderConfirm(true);

  const handleCancelOrderConfirmClose: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      cancelSale({ orderId: order.id, nodeId: currentNode.id })
        .unwrap()
        .then(() => toast.success(t("order.cancelSuccessful")))
        .catch((err) => undefined); // to avoid uncaught promise errors
    }

    setShowCancelOrderConfirm(false);
  };

  return (
    <DetailLayout
      title={t("order.name", { id: orderId })}
      routes={OrderRoutes}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(OrderRoutes.edit(orderId)),
          color: "primary",
          icon: <EditIcon />,
          hidden: order.order_type !== "sale",
        },
        {
          label: t("order.cancel"),
          onClick: openConfirmCancelOrderDialog,
          color: "error",
          icon: <CancelIcon />,
          hidden: order.order_type !== "sale",
        },
      ]}
    >
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
      <LineItemTable lineItems={order.line_items} />
      <ConfirmDialog
        title={t("order.confirmCancelOrderTitle")}
        show={showCancelOrderConfirm}
        body={t("order.confirmCancelOrderDescription")}
        onClose={handleCancelOrderConfirmClose}
      />
    </DetailLayout>
  );
};
