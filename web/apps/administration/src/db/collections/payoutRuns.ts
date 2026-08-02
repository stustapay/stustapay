import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createPayoutRun, listPayoutRuns } from "../api/generated";
import { client } from "../api/generated/client.gen";
import type { NewPayoutRun } from "../api/generated/types.gen";
import { zPayoutRunWithStats } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

type PayoutRunInsert = NewPayoutRun & { id: number; node_id: number };

export type PayoutRunCollectionInsert = NewPayoutRun &
  Pick<
    import("../api/generated/types.gen").PayoutRunWithStats,
    | "created_by"
    | "created_at"
    | "set_done_by"
    | "set_done_at"
    | "done"
    | "revoked"
    | "sepa_was_generated"
    | "total_donation_amount"
    | "total_payout_amount"
    | "n_payouts"
  > & { id: number; node_id: number };

const createPayoutRunCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `payout_runs_${nodeId}`,
      queryKey: ["nodes", nodeId, "payout-runs"],
      queryClient,
      getKey: (item) => item.id,
      schema: zPayoutRunWithStats,
      queryFn: async () => {
        const response = await listPayoutRuns({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            const payload = modified as unknown as PayoutRunInsert;
            return createPayoutRun({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                max_payout_sum: payload.max_payout_sum,
                max_num_payouts: payload.max_num_payouts,
              },
            });
          })
        );
      },
    })
  );
};

const payoutRunCollections: Record<number, ReturnType<typeof createPayoutRunCollection>> = {};

export const getPayoutRunCollection = (nodeId: number) => {
  if (!payoutRunCollections[nodeId]) {
    payoutRunCollections[nodeId] = createPayoutRunCollection(nodeId);
  }
  return payoutRunCollections[nodeId];
};
