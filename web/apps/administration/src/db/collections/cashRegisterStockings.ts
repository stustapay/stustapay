import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import {
  createRegisterStocking,
  deleteRegisterStocking,
  listRegisterStockings,
  updateRegisterStocking,
} from "../api/generated";
import { client } from "../api/generated/client.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createCashRegisterStockingCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `cash_register_stockings_${nodeId}`,
      queryKey: ["nodes", nodeId, "cash-register-stockings"],
      queryClient,
      getKey: (item) => item.id,
      queryFn: async () => {
        const response = await listRegisterStockings({
          query: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createRegisterStocking({
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
            return updateRegisterStocking({
              client: client,
              path: {
                stocking_id: original.id,
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
            return deleteRegisterStocking({
              client: client,
              path: {
                stocking_id: original.id,
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

const cashRegisterStockingCollections: Record<
  number,
  ReturnType<typeof createCashRegisterStockingCollection>
> = {};

export const getCashRegisterStockingCollection = (nodeId: number) => {
  if (!cashRegisterStockingCollections[nodeId]) {
    cashRegisterStockingCollections[nodeId] = createCashRegisterStockingCollection(nodeId);
  }
  return cashRegisterStockingCollections[nodeId];
};
