import { parseLoadSubsetOptions, queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";

import { listOrders } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zOrder } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const getFilterFieldName = (field: Array<string | number>) => String(field.at(-1));

const parseOrderFilters = (loadSubsetOptions: LoadSubsetOptions | undefined) => {
  const { filters } = parseLoadSubsetOptions(loadSubsetOptions ?? undefined);
  let customerAccountId: number | undefined;
  let tillId: number | undefined;

  for (const filter of filters) {
    if (filter.operator !== "eq") {
      continue;
    }

    const field = getFilterFieldName(filter.field);
    if (field === "customer_account_id") {
      customerAccountId = filter.value;
    } else if (field === "till_id") {
      tillId = filter.value;
    }
  }

  return { customerAccountId, tillId };
};

const createOrderCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      syncMode: "on-demand",
      id: `orders_${nodeId}`,
      queryKey: (opts) => {
        const { subscription: _subscription, ...serializableOptions } = opts;
        return ["nodes", nodeId, "orders", serializableOptions];
      },
      queryClient,
      getKey: (item) => item.id,
      schema: zOrder,
      select: (data) => data.items,
      queryFn: async (context) => {
        const loadSubsetOptions = context.meta?.loadSubsetOptions as LoadSubsetOptions | undefined;
        const { customerAccountId, tillId } = parseOrderFilters(loadSubsetOptions);
        const { limit } = parseLoadSubsetOptions(loadSubsetOptions ?? undefined);
        const offset = loadSubsetOptions?.offset;

        const response = await listOrders({
          query: {
            node_id: nodeId,
            customer_account_id: customerAccountId,
            till_id: tillId,
            offset: offset ?? 0,
            limit: limit ?? undefined,
          },
          client: client,
        });
        return response.data ?? { items: [], total: 0 };
      },
    }),
  );
};

const orderCollections: Record<number, ReturnType<typeof createOrderCollection>> = {};

export const getOrderCollection = (nodeId: number) => {
  if (!orderCollections[nodeId]) {
    orderCollections[nodeId] = createOrderCollection(nodeId);
  }
  return orderCollections[nodeId];
};
