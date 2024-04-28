import * as React from "react";
import { ObjectType } from "@/api";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentNodeAllowsObject = (objectType?: ObjectType): boolean => {
  const { currentNode } = useCurrentNode();

  return React.useMemo(() => {
    if (objectType == null) {
      return true;
    }
    return !currentNode.computed_forbidden_objects_at_node.includes(objectType);
  }, [currentNode, objectType]);
};
