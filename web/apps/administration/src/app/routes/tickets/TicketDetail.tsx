import { useDeleteTicketMutation, useGetTicketQuery, useUpdateTicketMutation } from "@/api";
import { TicketRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TicketDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [deleteTicket] = useDeleteTicketMutation();
  const { data: ticket, error } = useGetTicketQuery({ nodeId: currentNode.id, ticketId: Number(ticketId) });
  const [updateTicket] = useUpdateTicketMutation();
  const openModal = useOpenModal();

  if (error) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("ticket.delete"),
      content: t("ticket.deleteDescription"),
      onConfirm: () => {
        deleteTicket({ nodeId: currentNode.id, ticketId: Number(ticketId) }).then(() => navigate(TicketRoutes.list()));
        return true;
      },
    });
  };

  if (ticket === undefined) {
    return <Loading />;
  }

  const handleLockTicket = () => {
    updateTicket({ nodeId: currentNode.id, ticketId: ticket.id, newTicket: { ...ticket, is_locked: true } });
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
          label: t("ticket.lock"),
          disabled: ticket.is_locked,
          onClick: handleLockTicket,
          color: "error",
          icon: <LockIcon />,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <DetailView>
        <DetailField label={t("ticket.name")} value={ticket.name} />
        <DetailField
          label={t("ticket.restriction")}
          value={ticket.restrictions.length > 0 ? ticket.restrictions[0] : ""}
        />
        <DetailNumberField
          label={t("ticket.initialTopUpAmount")}
          type="currency"
          value={ticket.initial_top_up_amount}
        />
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
