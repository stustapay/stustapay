import { TicketRoutes } from "@/app/routes";
import { useGetTicketQuery, useUpdateTicketMutation } from "@api";
import { EditLayout } from "@components";
import { Loading } from "@stustapay/components";
import { TicketSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TicketForm } from "./TicketForm";

export const TicketUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const { data: ticket, isLoading, error } = useGetTicketQuery({ ticketId: Number(ticketId) });
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
      submitLabel={t("update")}
      successRoute={TicketRoutes.detail(ticket.id)}
      initialValues={ticket}
      validationSchema={TicketSchema}
      onSubmit={(t) => updateTicket({ ticketId: ticket.id, newTicket: t })}
      form={TicketForm}
    />
  );
};
