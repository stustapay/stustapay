import { Event } from "@/api";
import { useCurrentNode } from "./useCurrentNode";

export const useCurrentEvent = (): { event: Event } => {
  const { currentNode } = useCurrentNode();
  if (!currentNode.event) {
    // TODO: TREE do tree marching
    throw new Error("Current node does not have an event");
  }
  return { event: currentNode.event };
};
