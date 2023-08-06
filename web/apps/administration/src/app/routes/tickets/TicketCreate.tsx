import { TicketRoutes } from "@/app/routes";
import { CreateLayout } from "@components";
import { NewTicket, NewTicketSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCreateTicketMutation } from "../../../api";
import { TicketForm } from "./TicketForm";

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
    <CreateLayout
      title={t("ticket.create")}
      submitLabel={t("add")}
      successRoute={TicketRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTicketSchema}
      onSubmit={(ticket) => createTicket({ newTicket: ticket })}
      form={TicketForm}
    />
  );
};
