import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createTaxRate, deleteTaxRate, listTaxRates, updateTaxRate } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTaxRate } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTaxRateCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `tax_rates_${nodeId}`,
      queryKey: ["nodes", nodeId, "tax_rates"],
      queryClient,
      getKey: (item) => item.id,
      schema: zTaxRate,
      queryFn: async () => {
        const response = await listTaxRates({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createTaxRate({
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
            return updateTaxRate({
              client: client,
              path: {
                tax_rate_id: original.id,
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
            return deleteTaxRate({
              client: client,
              path: {
                tax_rate_id: original.id,
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

const taxRateCollections: Record<number, ReturnType<typeof createTaxRateCollection>> = {};

export const getTaxRateCollection = (nodeId: number) => {
  if (!taxRateCollections[nodeId]) {
    taxRateCollections[nodeId] = createTaxRateCollection(nodeId);
  }
  return taxRateCollections[nodeId];
};
