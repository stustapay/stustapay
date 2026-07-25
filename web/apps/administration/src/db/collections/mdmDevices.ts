import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listMdmDevices } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zMdmDeviceWithMapping } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createMdmDeviceCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `mdm_devices_${nodeId}`,
      queryKey: ["nodes", nodeId, "mdm-devices"],
      queryClient,
      getKey: (item) => item.device.device_id,
      schema: zMdmDeviceWithMapping,
      queryFn: async () => {
        const response = await listMdmDevices({
          query: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
    }),
  );
};

const mdmDeviceCollections: Record<number, ReturnType<typeof createMdmDeviceCollection>> = {};

export const getMdmDeviceCollection = (nodeId: number) => {
  if (!mdmDeviceCollections[nodeId]) {
    mdmDeviceCollections[nodeId] = createMdmDeviceCollection(nodeId);
  }
  return mdmDeviceCollections[nodeId];
};
