import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTerminal, deleteTerminal, listTerminals, updateTerminal } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTerminal } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTerminalCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `terminals_${nodeId}`,
      queryKey: ["nodes", nodeId, "terminals"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTerminal,
      queryFn: async () => {
        const response = await listTerminals({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTerminal({
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
            return updateTerminal({
              client: client,
              path: {
                terminal_id: original.id,
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
            return deleteTerminal({
              client: client,
              path: {
                terminal_id: original.id,
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

const terminalCollections: Record<number, ReturnType<typeof createTerminalCollection>> = {};

export const getTerminalCollection = (nodeId: number) => {
  if (!terminalCollections[nodeId]) {
    terminalCollections[nodeId] = createTerminalCollection(nodeId);
  }
  return terminalCollections[nodeId];
};
