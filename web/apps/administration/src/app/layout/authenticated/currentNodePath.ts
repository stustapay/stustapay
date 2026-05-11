import { NodeSeenByUser } from "@/api";

const findNode = (nodeId: number, startNode: NodeSeenByUser): NodeSeenByUser | undefined => {
  if (startNode.id === nodeId) {
    return startNode;
  }

  for (const child of startNode.children) {
    const found = findNode(nodeId, child);
    if (found) {
      return found;
    }
  }

  return undefined;
};

export const getCurrentNodePath = (root: NodeSeenByUser, nodeId: number | null): string[] | null => {
  if (nodeId == null) {
    return null;
  }

  const currentNode = findNode(nodeId, root);
  if (!currentNode) {
    return null;
  }

  return [...currentNode.parent_ids, currentNode.id]
    .map((id) => findNode(id, root)?.name)
    .filter((name): name is string => name != null);
};
