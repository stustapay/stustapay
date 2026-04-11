import * as React from "react";
import { useNodeTree, findNode } from "@/api";
import { PrivilegeRequirement, hasAnyPrivilege } from "@/core/privileges";

export const useCurrentUserHasPrivilegeAtNode = (privilege?: PrivilegeRequirement): ((nodeId: number) => boolean) => {
  const { root } = useNodeTree();
  return React.useCallback(
    (nodeId: number) => {
      const node = findNode(nodeId, root);
      if (node == null) {
        return false;
      }

      return hasAnyPrivilege(node.privileges_at_node, privilege);
    },
    [root, privilege]
  );
};
