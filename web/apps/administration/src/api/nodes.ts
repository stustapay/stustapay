import { useGetTreeForCurrentUserQuery } from "./api";
import { Node } from "@/api";

export const findNode = (nodeId: number, startNode: Node): Node | undefined => {
  const currNode = startNode;
  if (currNode.id === nodeId) {
    return currNode;
  }
  for (const child of currNode.children) {
    const found = findNode(nodeId, child);
    if (found) {
      return found;
    }
  }
  return undefined;
};

export const useNodeTree = (): { root: Node } => {
  const { data: rootNode } = useGetTreeForCurrentUserQuery();
  if (!rootNode) {
    throw new Error(
      "tree has not been loaded, please make sure to preload this before rendering a component which uses the useNodeTree hook"
    );
  }
  return { root: rootNode as Node };
};

export const useNode = ({ nodeId }: { nodeId: number }): { node: Node | undefined } => {
  const { root } = useNodeTree();
  return { node: findNode(nodeId, root) };
};
