import { Loading } from "@stustapay/components";
import { NewTicketSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TicketRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTicketCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TicketForm } from "./TicketForm";

export const TicketUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { ticketId } = useParams();
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

  if (isError) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  if (isLoading || !ticket) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("ticket.update")}
      successRoute={TicketRoutes.detail(ticket.id)}
      initialValues={ticket}
      validationSchema={NewTicketSchema}
      onSubmit={(t) =>
        getTicketCollection(currentNode.id).update(ticket.id, (draft) => {
          draft.name = t.name;
          draft.price = t.price;
          draft.tax_rate_id = t.tax_rate_id;
          draft.initial_top_up_amount = t.initial_top_up_amount;
          draft.is_locked = t.is_locked ?? false;
          draft.user_tag_variant_ids = t.user_tag_variant_ids ?? [];
        })
      }
      form={TicketForm}
    />
  );
});
