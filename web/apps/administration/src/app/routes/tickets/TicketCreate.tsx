import * as React from "react";
import { useCreateTicketMutation } from "../../../api";
import { useTranslation } from "react-i18next";
import { TicketChange } from "./TicketChange";
import { NewTicket, NewTicketSchema } from "@stustapay/models";

const initialValues: NewTicket = {
  name: "",
  description: "",
  initial_top_up_amount: 0,
  product_id: null as unknown as number, // to force a non selected initial value
  restriction: null,
};

export const TicketCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTicket] = useCreateTicketMutation();

  return (
    <TicketChange
      headerTitle={t("ticket.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTicketSchema}
      onSubmit={(ticket) => createTicket({ newTicket: ticket })}
    />
  );
};
