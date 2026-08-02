import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTicket, deleteTicket, listTickets, updateTicket } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTicket } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTicketCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `tickets_${nodeId}`,
      queryKey: ["nodes", nodeId, "tickets"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTicket,
      queryFn: async () => {
        const response = await listTickets({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTicket({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: modified,
            });
          })
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original, modified }) => {
            return updateTicket({
              client: client,
              path: {
                ticket_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
              body: modified,
            });
          })
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            return deleteTicket({
              client: client,
              path: {
                ticket_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
            });
          })
        );
      },
    })
  );
};

const ticketCollections: Record<number, ReturnType<typeof createTicketCollection>> = {};

export const getTicketCollection = (nodeId: number) => {
  if (!ticketCollections[nodeId]) {
    ticketCollections[nodeId] = createTicketCollection(nodeId);
  }
  return ticketCollections[nodeId];
};
