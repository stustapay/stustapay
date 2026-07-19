import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createProduct, deleteProduct, listProducts, updateProduct } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zProduct } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createProductCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `products_${nodeId}`,
      queryKey: ["nodes", nodeId, "products"],
      queryClient,
      getKey: (item) => item.id,
      schema: zProduct,
      queryFn: async () => {
        const response = await listProducts({ query: { node_id: nodeId }, client: client });

        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createProduct({
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
            return updateProduct({
              client: client,
              path: {
                product_id: original.id,
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
            return deleteProduct({
              client: client,
              path: {
                product_id: original.id,
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

const productCollections: Record<number, ReturnType<typeof createProductCollection>> = {};

export const getProductCollection = (nodeId: number) => {
  if (!productCollections[nodeId]) {
    productCollections[nodeId] = createProductCollection(nodeId);
  }
  return productCollections[nodeId];
};
