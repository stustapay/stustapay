import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listSystemAccounts } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createSystemAccountCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `system_accounts_${nodeId}`,
      queryKey: ["nodes", nodeId, "system-accounts"],
      queryClient,
      getKey: (item) => item.id,
      queryFn: async () => {
        const response = await listSystemAccounts({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
    }),
  );
};

const systemAccountCollections: Record<
  number,
  ReturnType<typeof createSystemAccountCollection>
> = {};

export const getSystemAccountCollection = (nodeId: number) => {
  if (!systemAccountCollections[nodeId]) {
    systemAccountCollections[nodeId] = createSystemAccountCollection(nodeId);
  }
  return systemAccountCollections[nodeId];
};
