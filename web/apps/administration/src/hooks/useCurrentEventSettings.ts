import { PublicEventSettings } from "@/api";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentEventSettings = (): { eventSettings: PublicEventSettings } => {
  const { currentNode } = useCurrentNode();
  if (!currentNode.event) {
    // TODO: TREE do tree marching
    throw new Error("Current node does not have an event");
  }
  return { eventSettings: currentNode.event };
};
