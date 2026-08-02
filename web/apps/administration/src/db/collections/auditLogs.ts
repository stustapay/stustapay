import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listAuditLogs } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zAuditLogDetail } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createAuditLogCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `audit_logs_${nodeId}`,
      queryKey: ["nodes", nodeId, "audit-logs"],
      queryClient,
      getKey: (item) => item.id,
      schema: zAuditLogDetail,
      queryFn: async () => {
        const response = await listAuditLogs({
          path: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
    })
  );
};

const auditLogCollections: Record<number, ReturnType<typeof createAuditLogCollection>> = {};

export const getAuditLogCollection = (nodeId: number) => {
  if (!auditLogCollections[nodeId]) {
    auditLogCollections[nodeId] = createAuditLogCollection(nodeId);
  }
  return auditLogCollections[nodeId];
};
