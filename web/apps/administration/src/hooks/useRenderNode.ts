import { findNode, useNodeTree } from "@/api";
import { useCallback } from "react";

export type UseRenderNodeReturn = (nodeId: number) => string;

export const useRenderNode = (): UseRenderNodeReturn => {
  const { root } = useNodeTree();

  const renderNode = useCallback(
    (nodeId: number) => {
      const node = findNode(nodeId, root);
      if (!node) {
        return "";
      }

      return node.name;
    },
    [root]
  );

  return renderNode;
};
