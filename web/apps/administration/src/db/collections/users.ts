import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createUser, deleteUser, listUsers, updateUser } from "../api/generated";
import { client } from "../api/generated/client.gen";
import type { EventPrivilege, NodePrivilege } from "../api/generated/types.gen";
import { zUser } from "../api/generated/zod.gen";
import { queryClient } from "./api";
import { commonQueryCollectionOptions } from "./common";

type UserCollectionOptions = {
  filterPrivilege?: EventPrivilege | NodePrivilege | null;
};

const getUserCollectionKey = (nodeId: number, filterPrivilege?: EventPrivilege | NodePrivilege | null) =>
  `${nodeId}:${filterPrivilege ?? "all"}`;

const createUserCollection = (nodeId: number, filterPrivilege?: EventPrivilege | NodePrivilege | null) => {
  return createCollection(
    queryCollectionOptions({
      ...commonQueryCollectionOptions,
      id: `users_${getUserCollectionKey(nodeId, filterPrivilege)}`,
      queryKey: ["nodes", nodeId, "users", filterPrivilege ?? "all"],
      queryClient,
      getKey: (item) => item.id,
      schema: zUser,
      queryFn: async () => {
        const response = await listUsers({
          query: {
            node_id: nodeId,
            filter_privilege: filterPrivilege ?? undefined,
          },
          client: client,
        });
        return response.data ?? [];
      },
      onInsert: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            const { password, ...userFields } = modified as typeof modified & {
              password?: string | null;
            };
            return createUser({
              client: client,
              query: {
                node_id: nodeId,
              },
              body: {
                ...userFields,
                password: password ?? undefined,
              },
            });
          })
        );
      },
      onUpdate: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original, modified }) => {
            return updateUser({
              client: client,
              path: {
                user_id: original.id,
              },
              query: {
                node_id: nodeId,
              },
              body: {
                login: modified.login,
                display_name: modified.display_name,
                description: modified.description,
                user_tag_pin: modified.user_tag_pin,
                user_tag_uid_hex: modified.user_tag_uid_hex,
              },
            });
          })
        );
      },
      onDelete: async ({ transaction }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            return deleteUser({
              client: client,
              path: {
                user_id: original.id,
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

const userCollections: Record<string, ReturnType<typeof createUserCollection>> = {};

export const getUserCollection = (nodeId: number, options?: UserCollectionOptions) => {
  const key = getUserCollectionKey(nodeId, options?.filterPrivilege);
  if (!userCollections[key]) {
    userCollections[key] = createUserCollection(nodeId, options?.filterPrivilege);
  }
  return userCollections[key];
};
