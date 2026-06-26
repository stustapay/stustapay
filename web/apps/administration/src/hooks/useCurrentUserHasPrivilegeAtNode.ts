import * as React from "react";

import { EventPrivilege, NodePrivilege, useNodeTree, findNode } from "@/api";

export const useCurrentUserHasPrivilegeAtNode = (
  privilege?: EventPrivilege | NodePrivilege
): ((nodeId: number) => boolean) => {
  const { root } = useNodeTree();
  return React.useCallback(
    (nodeId: number) => {
      if (privilege == null) {
        return true;
      }
      const node = findNode(nodeId, root);
      if (node == null) {
        return false;
      }

      return (
        node.node_privileges_at_node.includes(privilege as NodePrivilege) ||
        node.event_privileges_at_node.includes(privilege as EventPrivilege)
      );
    },
    [root, privilege]
  );
};
