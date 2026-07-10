import { NewTicket, NewTicketSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TicketRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { useCreateTicketMutation } from "../../../api";
import { TicketForm } from "./TicketForm";

const initialValues: NewTicket = {
  name: "",
  price: 0,
  tax_rate_id: null as unknown as number,
  initial_top_up_amount: 0,
  is_locked: false,
  user_tag_variant_ids: [],
};

export const TicketCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTicket] = useCreateTicketMutation();

  return (
    <CreateLayout
      title={t("ticket.create")}
      successRoute={TicketRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTicketSchema}
      onSubmit={(ticket) => createTicket({ nodeId: currentNode.id, newTicket: ticket })}
      form={TicketForm}
    />
  );
});
