import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listTerminalLocations } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zTerminalLocation } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createTerminalLocationCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `terminal_locations_${nodeId}`,
      queryKey: ["nodes", nodeId, "terminal-locations"],
      queryClient,
      getKey: (item) => item.mdm_device_id,
      schema: zTerminalLocation,
      queryFn: async () => {
        const response = await listTerminalLocations({
          query: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
    }),
  );
};

const terminalLocationCollections: Record<
  number,
  ReturnType<typeof createTerminalLocationCollection>
> = {};

export const getTerminalLocationCollection = (nodeId: number) => {
  if (!terminalLocationCollections[nodeId]) {
    terminalLocationCollections[nodeId] = createTerminalLocationCollection(nodeId);
  }
  return terminalLocationCollections[nodeId];
};
