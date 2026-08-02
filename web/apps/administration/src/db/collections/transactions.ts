import type { LoadSubsetOptions } from "@tanstack/db";
import { parseLoadSubsetOptions, queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";

import { listTransactions } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTransaction } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const zTransactionCollectionItem = zTransaction.extend({
  cash_register_id: z.number().optional(),
});

const getFilterFieldName = (field: Array<string | number>) => String(field.at(-1));

const parseTransactionFilters = (loadSubsetOptions: LoadSubsetOptions | undefined) => {
  const { filters } = parseLoadSubsetOptions(loadSubsetOptions ?? undefined);
  let cashRegisterId: number | undefined;
  let transactionId: number | undefined;

  for (const filter of filters) {
    if (filter.operator !== "eq") {
      continue;
    }

    const field = getFilterFieldName(filter.field);
    if (field === "cash_register_id") {
      cashRegisterId = filter.value;
    } else if (field === "id") {
      transactionId = filter.value;
    }
  }

  return { cashRegisterId, transactionId };
};

const createTransactionCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      syncMode: "on-demand",
      id: `transactions_${nodeId}`,
      queryKey: (opts) => {
        const { subscription: _subscription, ...serializableOptions } = opts;
        return ["nodes", nodeId, "transactions", serializableOptions];
      },
      queryClient,
      getKey: (item) => item.id,
      schema: zTransactionCollectionItem,
      select: (data) => data.items,
      queryFn: async (context) => {
        const loadSubsetOptions = context.meta?.loadSubsetOptions as LoadSubsetOptions | undefined;
        const { cashRegisterId, transactionId } = parseTransactionFilters(loadSubsetOptions);
        const { limit } = parseLoadSubsetOptions(loadSubsetOptions ?? undefined);
        const offset = loadSubsetOptions?.offset;

        const response = await listTransactions({
          query: {
            node_id: nodeId,
            cash_register_id: cashRegisterId,
            transaction_id: transactionId,
            offset: offset ?? 0,
            limit: limit ?? undefined,
          },
          client: client,
        });
        return response.data ?? { items: [], total: 0 };
      },
    })
  );
};

const transactionCollections: Record<number, ReturnType<typeof createTransactionCollection>> = {};

export const getTransactionCollection = (nodeId: number) => {
  if (!transactionCollections[nodeId]) {
    transactionCollections[nodeId] = createTransactionCollection(nodeId);
  }
  return transactionCollections[nodeId];
};
