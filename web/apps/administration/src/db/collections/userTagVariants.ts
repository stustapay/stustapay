import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import {
  createUserTagVariant,
  deleteUserTagVariant,
  listUserTagVariants,
  updateUserTagVariant,
} from "../api/generated";
import { client } from "../api/generated/client.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createUserTagVariantCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `user_tag_variants_${nodeId}`,
      queryKey: ["nodes", nodeId, "user-tag-variants"],
      queryClient,
      getKey: (item) => item.id,
      queryFn: async () => {
        const response = await listUserTagVariants({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createUserTagVariant({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: modified,
            });
          }),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original, modified }) => {
            return updateUserTagVariant({
              client: client,
              path: {
                user_tag_variant_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
              body: modified,
            });
          }),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            return deleteUserTagVariant({
              client: client,
              path: {
                user_tag_variant_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
            });
          }),
        );
      },
    }),
  );
};

const userTagVariantCollections: Record<
  number,
  ReturnType<typeof createUserTagVariantCollection>
> = {};

export const getUserTagVariantCollection = (nodeId: number) => {
  if (!userTagVariantCollections[nodeId]) {
    userTagVariantCollections[nodeId] = createUserTagVariantCollection(nodeId);
  }
  return userTagVariantCollections[nodeId];
};
