import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTill, deleteTill, listTills, updateTill } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTill } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTillCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `tills_${nodeId}`,
      queryKey: ["nodes", nodeId, "tills"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTill,
      queryFn: async () => {
        const response = await listTills({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTill({
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
            return updateTill({
              client: client,
              path: {
                till_id: original.id,
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
            return deleteTill({
              client: client,
              path: {
                till_id: original.id,
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

const tillCollections: Record<number, ReturnType<typeof createTillCollection>> = {};

export const getTillCollection = (nodeId: number) => {
  if (!tillCollections[nodeId]) {
    tillCollections[nodeId] = createTillCollection(nodeId);
  }
  return tillCollections[nodeId];
};
