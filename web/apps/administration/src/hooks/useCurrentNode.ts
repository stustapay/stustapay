import { useParams } from "react-router-dom";

import { NodeSeenByUser } from "@/api";
import { useNode, useNodeTree } from "@/api/nodes";

export const useCurrentNode = (): { currentNode: NodeSeenByUser } => {
  const { root } = useNodeTree();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: nodeId ? Number(nodeId) : 0 });
  return { currentNode: node ?? root };
};
