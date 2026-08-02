import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon, LockOpen as UnlockIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { TicketRoutes } from "@/app/routes";
import { DetailBoolField, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { getTicketCollection, getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const TicketDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const {
    data: ticket,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ tickets: getTicketCollection(currentNode.id) })
        .where(({ tickets }) => eq(tickets.id, Number(ticketId)))
        .findOne(),
    [currentNode.id, ticketId]
  );

  const { data: userTagVariants, isLoading: isUserTagVariantsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ userTagVariants: getUserTagVariantCollection(currentNode.id) })
        .where(({ userTagVariants }) => inArray(userTagVariants.id, ticket?.user_tag_variant_ids ?? [])),
    [currentNode.id, ticket?.user_tag_variant_ids]
  );
  const openModal = useOpenModal();

  if (isError) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  if (isLoading || !ticket || isUserTagVariantsLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("ticket.delete"),
      content: t("ticket.deleteDescription"),
      onConfirm: () => {
        getTicketCollection(currentNode.id)
          .delete(Number(ticketId))
          .isPersisted.promise.then(() => navigate(TicketRoutes.list()));
        return true;
      },
    });
  };

  const handleToggleLockTicket = () => {
    getTicketCollection(currentNode.id).update(ticket.id, (draft) => {
      draft.is_locked = !draft.is_locked;
    });
  };

  return (
    <DetailLayout
      title={ticket.name}
      routes={TicketRoutes}
      elementNodeId={ticket.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TicketRoutes.edit(ticketId)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: ticket.is_locked ? t("ticket.unlock") : t("ticket.lock"),
          onClick: handleToggleLockTicket,
          color: "error",
          icon: ticket.is_locked ? <UnlockIcon /> : <LockIcon />,
        },
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("ticket.name")} value={ticket.name} />
        <DetailField label={t("ticket.restriction")} value={userTagVariants?.[0]?.variant_name} />
        <DetailNumberField
          label={t("ticket.initialTopUpAmount")}
          type="currency"
          value={ticket.initial_top_up_amount}
        />
        <DetailBoolField label={t("ticket.isLocked")} value={ticket.is_locked} />
        <DetailNumberField label={t("ticket.price")} type="currency" value={ticket.price} />
        <DetailField
          label={t("ticket.taxRate")}
          value={`${ticket.tax_name} (${(ticket.tax_rate * 100).toFixed(0)}%)`}
        />
        <DetailNumberField label={t("ticket.totalPrice")} type="currency" value={ticket.total_price} />
      </DetailView>
    </DetailLayout>
  );
};
