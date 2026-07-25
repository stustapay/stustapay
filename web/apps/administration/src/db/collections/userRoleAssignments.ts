import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listUserRoleAssignments } from "../api/generated";
import { client } from "../api/generated/client.gen";
import type { UserRoleAssignment } from "../api/generated/types.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createUserRoleAssignmentCollection = (nodeId: number, userId: number) => {
  return createCollection(
    queryCollectionOptions<UserRoleAssignment>({
      ...commonQueryCollectionOptions,
      id: `user_role_assignments_${nodeId}_${userId}`,
      queryKey: ["nodes", nodeId, "users", userId, "role-assignments"],
      queryClient,
      getKey: (item) => item.node_id,
      queryFn: async () => {
        const response = await listUserRoleAssignments({
          path: { user_id: userId },
          query: { node_id: nodeId },
          client: client,
        });
        return response.data ?? [];
      },
    }),
  );
};

const userRoleAssignmentCollections: Record<
  string,
  ReturnType<typeof createUserRoleAssignmentCollection>
> = {};

export const getUserRoleAssignmentCollection = (nodeId: number, userId: number) => {
  const key = `${nodeId}_${userId}`;
  if (!userRoleAssignmentCollections[key]) {
    userRoleAssignmentCollections[key] = createUserRoleAssignmentCollection(nodeId, userId);
  }
  return userRoleAssignmentCollections[key];
};
