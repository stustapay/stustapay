import * as React from "react";
import { Privilege } from "@/api";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentUserHasPrivilege = (privilege?: Privilege): boolean => {
  const { currentNode } = useCurrentNode();
  return React.useMemo(() => {
    if (privilege == null) {
      return true;
    }
    return currentNode.privileges_at_node.includes(privilege);
  }, [currentNode, privilege]);
};
