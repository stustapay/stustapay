import { useGetTreeForCurrentUserQuery } from "./api";
import { NodeSeenByUserRead } from "@/api";
import { useCurrentUser } from "@/hooks";

export const findNode = (nodeId: number, startNode: NodeSeenByUserRead): NodeSeenByUserRead | undefined => {
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

export const useNodeTree = (): { root: NodeSeenByUserRead } => {
  const { data: rootNode } = useGetTreeForCurrentUserQuery();
  if (!rootNode) {
    throw new Error(
      "tree has not been loaded, please make sure to preload this before rendering a component which uses the useNodeTree hook"
    );
  }
  return { root: rootNode as NodeSeenByUserRead };
};

export const useTreeForCurrentUser = (): NodeSeenByUserRead => {
  const currentUser = useCurrentUser();
  const { data: rootNode } = useGetTreeForCurrentUserQuery();
  if (!rootNode) {
    throw new Error(
      "tree has not been loaded, please make sure to preload this before rendering a component which uses the useNodeTree hook"
    );
  }
  const userNode = findNode(currentUser.node_id, rootNode);
  if (!userNode) {
    throw new Error("the node of the current user could not be found");
  }
  return userNode;
};

export const useNode = ({ nodeId }: { nodeId: number }): { node: NodeSeenByUserRead | undefined } => {
  const { root } = useNodeTree();
  return { node: findNode(nodeId, root) };
};
