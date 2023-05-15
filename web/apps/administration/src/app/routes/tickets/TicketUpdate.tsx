import * as React from "react";
import { useTranslation } from "react-i18next";
import { selectTicketById, useGetTicketByIdQuery, useUpdateTicketMutation } from "@api";
import { Navigate, useParams } from "react-router-dom";
import { TicketChange } from "./TicketChange";
import { TicketSchema } from "@stustapay/models";
import { Loading } from "@stustapay/components";

export const TicketUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const { ticket, isLoading } = useGetTicketByIdQuery(Number(ticketId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      ticket: data ? selectTicketById(data, Number(ticketId)) : undefined,
    }),
  });
  const [updateTicket] = useUpdateTicketMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!ticket) {
    return <Navigate to="/tickets" />;
  }

  return (
    <TicketChange
      headerTitle={t("ticket.update")}
      submitLabel={t("update")}
      initialValues={ticket}
      validationSchema={TicketSchema}
      onSubmit={updateTicket}
    />
  );
};
