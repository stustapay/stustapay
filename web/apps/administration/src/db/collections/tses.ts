import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTse, listTses, updateTse } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTse } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTseCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `tses_${nodeId}`,
      queryKey: ["nodes", nodeId, "tses"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTse,
      queryFn: async () => {
        const response = await listTses({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTse({
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
            return updateTse({
              client: client,
              path: {
                tse_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
              body: modified,
            });
          })
        );
      },
    })
  );
};

const tseCollections: Record<number, ReturnType<typeof createTseCollection>> = {};

export const getTseCollection = (nodeId: number) => {
  if (!tseCollections[nodeId]) {
    tseCollections[nodeId] = createTseCollection(nodeId);
  }
  return tseCollections[nodeId];
};
