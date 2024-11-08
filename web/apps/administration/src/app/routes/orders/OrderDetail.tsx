import {
  selectTillById,
  selectUserById,
  useCancelOrderMutation,
  useGetOrderQuery,
  useListTillsQuery,
  useListUsersQuery,
} from "@/api";
import { CashierRoutes, CustomerRoutes, OrderRoutes, TillRoutes, UserTagRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { LineItemTable } from "@/components/LineItemTable";
import { useCurrentNode } from "@/hooks";
import { Cancel as CancelIcon, Edit as EditIcon } from "@mui/icons-material";
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
      <DetailView>
        <DetailField label={t("order.id")} value={order.id} />
        <DetailField label={t("order.paymentMethod")} value={order.payment_method} />
        <DetailField label={t("order.type")} value={order.order_type} />
        <DetailField label={t("order.bookedAt")} value={order.booked_at} />
        {cashier ? (
          <DetailField
            label={t("common.cashier")}
            value={getUserName(cashier)}
            linkTo={CashierRoutes.detail(cashier.id, cashier.node_id)}
          />
        ) : (
          <DetailField label={t("common.cashier")} value={t("order.noCashier")} />
        )}
        {till ? (
          <DetailField label={t("common.till")} value={till.name} linkTo={TillRoutes.detail(till.id, till.node_id)} />
        ) : (
          <DetailField label={t("common.till")} value={t("order.noTill")} />
        )}
        {order.customer_account_id != null && (
          <DetailField
            label={t("order.customerAccountId")}
            value={order.customer_account_id}
            linkTo={CustomerRoutes.detail(order.customer_account_id, currentNode.event_node_id)}
          />
        )}
        {order.customer_tag_uid_hex != null && (
          <DetailField
            label={t("order.customerTagUid")}
            value={formatUserTagUid(order.customer_tag_uid_hex)}
            linkTo={UserTagRoutes.detail(order.customer_tag_id, currentNode.event_node_id)}
          />
        )}
      </DetailView>
      <LineItemTable lineItems={order.line_items} />
    </DetailLayout>
  );
};
