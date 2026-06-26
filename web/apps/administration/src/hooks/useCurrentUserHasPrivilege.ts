import * as React from "react";

import { EventPrivilege, NodePrivilege } from "@/api";

import { useCurrentNode } from "./useCurrentNode";

export const useCurrentUserHasPrivilege = (privilege?: EventPrivilege | NodePrivilege): boolean => {
  const { currentNode } = useCurrentNode();
  return React.useMemo(() => {
    if (privilege == null) {
      return true;
    }
    return (
      currentNode.node_privileges_at_node.includes(privilege as NodePrivilege) ||
      currentNode.event_privileges_at_node.includes(privilege as EventPrivilege)
    );
  }, [currentNode, privilege]);
};
