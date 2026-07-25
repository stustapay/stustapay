import { parseLoadSubsetOptions, queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { LoadSubsetOptions } from "@tanstack/db";

import { listCashierShifts } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zCashierShift } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const getFilterFieldName = (field: Array<string | number>) => String(field.at(-1));

const parseCashierShiftFilters = (loadSubsetOptions: LoadSubsetOptions | undefined) => {
  const { filters } = parseLoadSubsetOptions(loadSubsetOptions ?? undefined);
  let cashierId: number | undefined;
  let cashRegisterId: number | undefined;
  let shiftId: number | undefined;

  for (const filter of filters) {
    if (filter.operator !== "eq") {
      continue;
    }

    const field = getFilterFieldName(filter.field);
    if (field === "cashier_id") {
      cashierId = filter.value;
    } else if (field === "cash_register_id") {
      cashRegisterId = filter.value;
    } else if (field === "id") {
      shiftId = filter.value;
    }
  }

  return { cashierId, cashRegisterId, shiftId };
};

const createCashierShiftCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      syncMode: "on-demand",
      id: `cashier_shifts_${nodeId}`,
      queryKey: ["nodes", nodeId, "cashier-shifts"],
      queryClient,
      getKey: (item) => item.id,
      schema: zCashierShift,
      queryFn: async (context) => {
        const { cashierId, cashRegisterId, shiftId } = parseCashierShiftFilters(
          context.meta?.loadSubsetOptions,
        );

        const response = await listCashierShifts({
          query: {
            node_id: nodeId,
            cashier_id: cashierId,
            cash_register_id: cashRegisterId,
            shift_id: shiftId,
          },
          client: client,
        });
        return response.data ?? [];
      },
    }),
  );
};

const cashierShiftCollections: Record<number, ReturnType<typeof createCashierShiftCollection>> = {};

export const getCashierShiftCollection = (nodeId: number) => {
  if (!cashierShiftCollections[nodeId]) {
    cashierShiftCollections[nodeId] = createCashierShiftCollection(nodeId);
  }
  return cashierShiftCollections[nodeId];
};
