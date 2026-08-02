import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listExternalTickets } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zExternalTicket } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createExternalTicketCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `external_tickets_${nodeId}`,
      queryKey: ["nodes", nodeId, "external-tickets"],
      schema: zExternalTicket,
      queryClient,
      getKey: (item) => item.id,
      queryFn: async () => {
        const response = await listExternalTickets({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
    })
  );
};

const externalTicketCollections: Record<number, ReturnType<typeof createExternalTicketCollection>> = {};

export const getExternalTicketCollection = (nodeId: number) => {
  if (!externalTicketCollections[nodeId]) {
    externalTicketCollections[nodeId] = createExternalTicketCollection(nodeId);
  }
  return externalTicketCollections[nodeId];
};
