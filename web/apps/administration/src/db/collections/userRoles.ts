import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createUserRole, deleteUserRole, listUserRoles, updateUserRole } from "../api/generated";
import { client } from "../api/generated/client.gen";
import type { UserRole } from "../api/generated/types.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

const createUserRoleCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions<UserRole>({
      ...commonQueryCollectionOptions,
      id: `user_roles_${nodeId}`,
      queryKey: ["nodes", nodeId, "user-roles"],
      queryClient,
      getKey: (item) => item.id,
      queryFn: async () => {
        const response = await listUserRoles({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            return createUserRole({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                name: modified.name,
                can_assign_all_roles: modified.can_assign_all_roles ?? false,
                assignable_role_ids: modified.assignable_role_ids ?? [],
                event_privileges: modified.event_privileges,
                node_privileges: modified.node_privileges,
              },
            });
          })
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original, modified }) => {
            return updateUserRole({
              client: client,
              path: {
                user_role_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
              body: {
                can_assign_all_roles: modified.can_assign_all_roles ?? false,
                assignable_role_ids: modified.assignable_role_ids ?? [],
                event_privileges: modified.event_privileges,
                node_privileges: modified.node_privileges,
              },
            });
          })
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            return deleteUserRole({
              client: client,
              path: {
                user_role_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
            });
          })
        );
      },
    })
  );
};

const userRoleCollections: Record<number, ReturnType<typeof createUserRoleCollection>> = {};

export const getUserRoleCollection = (nodeId: number) => {
  if (!userRoleCollections[nodeId]) {
    userRoleCollections[nodeId] = createUserRoleCollection(nodeId);
  }
  return userRoleCollections[nodeId];
};
