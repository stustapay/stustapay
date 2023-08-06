import * as React from "react";
import { useTranslation } from "react-i18next";
import { useGetTicketQuery, useUpdateTicketMutation } from "@api";
import { Navigate, useParams } from "react-router-dom";
import { TicketChange } from "./TicketChange";
import { TicketSchema } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import { TicketRoutes } from "@/app/routes";

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
    <TicketChange
      headerTitle={t("ticket.update")}
      submitLabel={t("update")}
      initialValues={ticket}
      validationSchema={TicketSchema}
      onSubmit={(ticket) => updateTicket({ ticketId: ticket.id, newTicket: ticket })}
    />
  );
};
