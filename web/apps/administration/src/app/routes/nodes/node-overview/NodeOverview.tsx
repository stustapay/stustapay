import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";

export const NodeOverview: React.FC = () => {
  const { currentNode } = useCurrentNode();

  if (currentNode.event != null) {
    return <EventOverview />;
  }

  return null;
};
