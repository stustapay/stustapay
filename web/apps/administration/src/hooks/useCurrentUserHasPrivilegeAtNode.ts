import * as React from "react";
import { Privilege, useNodeTree, findNode } from "@/api";

export const useCurrentUserHasPrivilegeAtNode = (privilege?: Privilege): ((nodeId: number) => boolean) => {
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

      return node.privileges_at_node.includes(privilege);
    },
    [root, privilege]
  );
};
