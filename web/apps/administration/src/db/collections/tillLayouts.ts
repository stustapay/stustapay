import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTillLayout, deleteTillLayout, listTillLayouts, updateTillLayout } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTillLayout } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTillLayoutCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `till_layouts_${nodeId}`,
      queryKey: ["nodes", nodeId, "till_layouts"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTillLayout,
      queryFn: async () => {
        const response = await listTillLayouts({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTillLayout({
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
            return updateTillLayout({
              client: client,
              path: {
                layout_id: original.id,
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
            return deleteTillLayout({
              client: client,
              path: {
                layout_id: original.id,
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

const tillLayoutCollections: Record<number, ReturnType<typeof createTillLayoutCollection>> = {};

export const getTillLayoutCollection = (nodeId: number) => {
  if (!tillLayoutCollections[nodeId]) {
    tillLayoutCollections[nodeId] = createTillLayoutCollection(nodeId);
  }
  return tillLayoutCollections[nodeId];
};
