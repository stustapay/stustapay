import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { payoutRunPayouts } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zPayout } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createPayoutRunPayoutCollection = (nodeId: number, payoutRunId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `payout_run_payouts_${nodeId}_${payoutRunId}`,
      queryKey: ["nodes", nodeId, "payout-runs", payoutRunId, "payouts"],
      queryClient,
      getKey: (item) => item.id,
      schema: zPayout,
      queryFn: async () => {
        const response = await payoutRunPayouts({
          path: { payout_run_id: payoutRunId },
          query: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
    }),
  );
};

const payoutRunPayoutCollections: Record<
  string,
  ReturnType<typeof createPayoutRunPayoutCollection>
> = {};

export const getPayoutRunPayoutCollection = (nodeId: number, payoutRunId: number) => {
  const key = `${nodeId}_${payoutRunId}`;
  if (!payoutRunPayoutCollections[key]) {
    payoutRunPayoutCollections[key] = createPayoutRunPayoutCollection(nodeId, payoutRunId);
  }
  return payoutRunPayoutCollections[key];
};
