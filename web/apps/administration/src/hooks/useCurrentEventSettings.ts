import { PublicEventSettings, findNode, useNodeTree } from "@/api";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentEventSettings = (): { eventSettings: PublicEventSettings } => {
  const { root } = useNodeTree();
  const { currentNode } = useCurrentNode();
  if (!currentNode.event) {
    if (currentNode.event_node_id == null) {
      throw new Error("This node is not part of any event");
    }

    const eventNode = findNode(currentNode.event_node_id, root);
    if (eventNode?.event == null) {
      throw new Error("No event could be found, this is an unexpected error");
    }

    return { eventSettings: eventNode.event };
  }
  return { eventSettings: currentNode.event };
};
