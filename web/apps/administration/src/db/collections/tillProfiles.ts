import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTillProfile, deleteTillProfile, listTillProfiles, updateTillProfile } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTillProfile } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTillProfileCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `till_profiles_${nodeId}`,
      queryKey: ["nodes", nodeId, "till_profiles"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTillProfile,
      queryFn: async () => {
        const response = await listTillProfiles({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTillProfile({
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
            return updateTillProfile({
              client: client,
              path: {
                profile_id: original.id,
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
            return deleteTillProfile({
              client: client,
              path: {
                profile_id: original.id,
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

const tillProfileCollections: Record<number, ReturnType<typeof createTillProfileCollection>> = {};

export const getTillProfileCollection = (nodeId: number) => {
  if (!tillProfileCollections[nodeId]) {
    tillProfileCollections[nodeId] = createTillProfileCollection(nodeId);
  }
  return tillProfileCollections[nodeId];
};
