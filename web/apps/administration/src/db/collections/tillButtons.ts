import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTillButton, deleteTillButton, listTillButtons, updateTillButton } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTillButton } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTillButtonCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `till_buttons_${nodeId}`,
      queryKey: ["nodes", nodeId, "till_buttons"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTillButton,
      queryFn: async () => {
        const response = await listTillButtons({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTillButton({
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
            return updateTillButton({
              client: client,
              path: {
                button_id: original.id,
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
            return deleteTillButton({
              client: client,
              path: {
                button_id: original.id,
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

const tillButtonCollections: Record<number, ReturnType<typeof createTillButtonCollection>> = {};

export const getTillButtonCollection = (nodeId: number) => {
  if (!tillButtonCollections[nodeId]) {
    tillButtonCollections[nodeId] = createTillButtonCollection(nodeId);
  }
  return tillButtonCollections[nodeId];
};
