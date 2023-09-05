import { useNodeTree } from "@/api/nodes";
import { Node } from "@/api";

export const useCurrentNode = (): { currentNode: Node } => {
  const { root } = useNodeTree();
  return { currentNode: root };
};
