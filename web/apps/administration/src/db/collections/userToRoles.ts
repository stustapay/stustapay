import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { listUserToRole, updateUserToRoles } from "../api/generated";
import { client } from "../api/generated/client.gen";
import { zUserToRoles } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

export const getUserToRoleKey = (nodeId: number, userId: number) => `${nodeId}:${userId}`;

const invalidateUserRoleAssignments = (nodeId: number, userId: number) =>
  queryClient.invalidateQueries({ queryKey: ["nodes", nodeId, "users", userId, "role-assignments"] });

const createUserToRoleCollection = (nodeId: number) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `user_to_roles_${nodeId}`,
      queryKey: ["nodes", nodeId, "user-to-roles"],
      queryClient,
      getKey: (item) => getUserToRoleKey(item.node_id, item.user_id),
      schema: zUserToRoles,
      queryFn: async () => {
        const response = await listUserToRole({ query: { node_id: nodeId }, client: client });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            await updateUserToRoles({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                user_id: modified.user_id,
                role_ids: modified.role_ids,
              },
            });
            await invalidateUserRoleAssignments(nodeId, modified.user_id);
          }),
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original, modified }) => {
            await updateUserToRoles({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                user_id: modified.user_id,
                role_ids: modified.role_ids,
              },
            });
            await invalidateUserRoleAssignments(nodeId, original.user_id);
          }),
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            await updateUserToRoles({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                user_id: original.user_id,
                role_ids: [],
              },
            });
            await invalidateUserRoleAssignments(nodeId, original.user_id);
          }),
        );
      },
    }),
  );
};

const userToRoleCollections: Record<number, ReturnType<typeof createUserToRoleCollection>> = {};

export const getUserToRoleCollection = (nodeId: number) => {
  if (!userToRoleCollections[nodeId]) {
    userToRoleCollections[nodeId] = createUserToRoleCollection(nodeId);
  }
  return userToRoleCollections[nodeId];
};
