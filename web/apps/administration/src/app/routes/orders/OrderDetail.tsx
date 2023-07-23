import * as React from "react";
import { IconButton, List, ListItem, ListItemText, Paper, Stack, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useCancelOrderMutation, useGetOrderQuery } from "@api";
import { Loading } from "@stustapay/components";
import { LineItemTable } from "@components/LineItemTable";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink, ListItemLink } from "@components";
import { formatUserTagUid } from "@stustapay/models";
import { Cancel as CancelIcon, Edit as EditIcon } from "@mui/icons-material";
import { toast } from "react-toastify";

export const OrderDetail: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [showCancelOrderConfirm, setShowCancelOrderConfirm] = React.useState(false);

  const [cancelSale] = useCancelOrderMutation();

  const { data: order, error, isLoading: isOrderLoading } = useGetOrderQuery({ orderId: Number(orderId) });

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
      cancelSale({ orderId: order.id })
        .unwrap()
        .then(() => toast.success(t("order.cancelSuccessful")))
        .catch((err) => undefined); // to avoid uncaught promise errors
    }

    setShowCancelOrderConfirm(false);
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            order.order_type === "sale" && (
              <>
                <Tooltip title={t("edit")}>
                  <span>
                    <IconButtonLink to={`/orders/${orderId}/edit`} color="primary">
                      <EditIcon />
                    </IconButtonLink>
                  </span>
                </Tooltip>
                <Tooltip title={t("order.cancel")}>
                  <span>
                    <IconButton onClick={openConfirmCancelOrderDialog} color="error">
                      <CancelIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )
          }
        >
          <ListItemText primary={t("order.name", { id: orderId })} />
        </ListItem>
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
      <LineItemTable lineItems={order.line_items} />
      <ConfirmDialog
        title={t("order.confirmCancelOrderTitle")}
        show={showCancelOrderConfirm}
        body={t("order.confirmCancelOrderDescription")}
        onClose={handleCancelOrderConfirmClose}
      />
    </Stack>
  );
};
