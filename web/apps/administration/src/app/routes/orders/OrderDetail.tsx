import {
  selectTillById,
  selectUserById,
  useCancelOrderMutation,
  useGetOrderQuery,
  useListTillsQuery,
  useListUsersQuery,
} from "@/api";
import { CashierRoutes, CustomerRoutes, OrderRoutes, TillRoutes, UserTagRoutes } from "@/app/routes";
import { DetailLayout, ListItemLink } from "@/components";
import { LineItemTable } from "@/components/LineItemTable";
import { useCurrentNode } from "@/hooks";
import { Cancel as CancelIcon, Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { formatUserTagUid, getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const OrderDetail: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();
  const openModal = useOpenModal();

  const [cancelSale] = useCancelOrderMutation();

  const {
    data: order,
    error,
    isLoading: isOrderLoading,
  } = useGetOrderQuery({ nodeId: currentNode.id, orderId: Number(orderId) });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });

  if (isOrderLoading || isTillsLoading || isUsersLoading) {
    return <Loading />;
  }

  if (error || !order || !users || !tills) {
    navigate(-1);
    return null;
  }

  const openConfirmCancelOrderDialog = () => {
    openModal({
      type: "confirm",
      title: t("order.confirmCancelOrderTitle"),
      content: t("order.confirmCancelOrderDescription"),
      onConfirm: () => {
        cancelSale({ orderId: order.id, nodeId: currentNode.id })
          .unwrap()
          .then(() => toast.success(t("order.cancelSuccessful")))
          .catch((err) => undefined); // to avoid uncaught promise errors
        return true;
      },
    });
  };

  const till = order.till_id != null ? selectTillById(tills, order.till_id) : undefined;
  const cashier = order.cashier_id != null ? selectUserById(users, order.cashier_id) : undefined;

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
          {cashier ? (
            <ListItemLink to={CashierRoutes.detail(cashier.id, cashier.node_id)}>
              <ListItemText primary={t("common.cashier")} secondary={getUserName(cashier)} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("common.cashier")} secondary={t("order.noCashier")} />
            </ListItem>
          )}
          {till ? (
            <ListItemLink to={TillRoutes.detail(till.id, till.node_id)}>
              <ListItemText primary={t("common.till")} secondary={till.name} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("common.till")} secondary={t("order.noTill")} />
            </ListItem>
          )}
          {order.customer_account_id != null && (
            <ListItemLink to={CustomerRoutes.detail(order.customer_account_id)}>
              <ListItemText primary={t("order.customerAccountId")} secondary={order.customer_account_id} />
            </ListItemLink>
          )}
          {order.customer_tag_uid_hex != null && (
            <ListItemLink to={UserTagRoutes.detail(order.customer_tag_id)}>
              <ListItemText
                primary={t("order.customerTagUid")}
                secondary={formatUserTagUid(order.customer_tag_uid_hex)}
              />
            </ListItemLink>
          )}
        </List>
      </Paper>
      <LineItemTable lineItems={order.line_items} />
    </DetailLayout>
  );
};
