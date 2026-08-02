import { NewTicket, NewTicketSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TicketRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getTicketCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

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

  return (
    <CreateLayoutV2
      title={t("ticket.create")}
      successRoute={TicketRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTicketSchema}
      onSubmit={(ticket) =>
        getTicketCollection(currentNode.id).insert({
          ...ticket,
          id: generateId(),
          node_id: currentNode.id,
          user_tag_variant_ids: ticket.user_tag_variant_ids ?? [],
          is_locked: ticket.is_locked ?? false,
          tax_name: "",
          tax_rate: 0,
          total_price: 0,
        })
      }
      form={TicketForm}
    />
  );
});
