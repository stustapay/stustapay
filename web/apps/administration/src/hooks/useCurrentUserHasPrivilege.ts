import * as React from "react";
import { PrivilegeRequirement, hasAnyPrivilege } from "@/core/privileges";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentUserHasPrivilege = (privilege?: PrivilegeRequirement): boolean => {
  const { currentNode } = useCurrentNode();
  return React.useMemo(() => {
    return hasAnyPrivilege(currentNode.privileges_at_node, privilege);
  }, [currentNode, privilege]);
};
