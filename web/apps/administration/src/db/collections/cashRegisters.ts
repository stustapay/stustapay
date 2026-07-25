import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createRegister, deleteRegister, listCashRegistersAdmin, updateRegister } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zCashRegister } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createCashRegisterCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `cash_registers_${nodeId}`,
      queryKey: ["nodes", nodeId, "cash-registers"],
      queryClient,
      getKey: (item) => item.id,
      schema: zCashRegister,
      queryFn: async () => {
        const response = await listCashRegistersAdmin({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createRegister({
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
            return updateRegister({
              client: client,
              path: {
                register_id: original.id,
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
            return deleteRegister({
              client: client,
              path: {
                register_id: original.id,
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

const cashRegisterCollections: Record<number, ReturnType<typeof createCashRegisterCollection>> = {};

export const getCashRegisterCollection = (nodeId: number) => {
  if (!cashRegisterCollections[nodeId]) {
    cashRegisterCollections[nodeId] = createCashRegisterCollection(nodeId);
  }
  return cashRegisterCollections[nodeId];
};
