import { useGetTicketQuery, useUpdateTicketMutation } from "@/api";
import { TicketRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { NewTicketSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TicketForm } from "./TicketForm";
import { withPrivilegeGuard } from "@/app/layout";

export const TicketUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { ticketId } = useParams();
  const { data: ticket, isLoading, error } = useGetTicketQuery({ nodeId: currentNode.id, ticketId: Number(ticketId) });
  const [updateTicket] = useUpdateTicketMutation();

  if (error) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  if (isLoading || !ticket) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("ticket.update")}
      successRoute={TicketRoutes.detail(ticket.id)}
      initialValues={ticket}
      validationSchema={NewTicketSchema}
      onSubmit={(t) => updateTicket({ nodeId: currentNode.id, ticketId: ticket.id, newTicket: t })}
      form={TicketForm}
    />
  );
});
