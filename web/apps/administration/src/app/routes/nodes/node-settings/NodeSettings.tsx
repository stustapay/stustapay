import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { EventSettings } from "../event-settings";
import { Stack } from "@mui/material";

export const NodeSettings: React.FC = () => {
  const { currentNode } = useCurrentNode();

  if (currentNode.event != null) {
    return <EventSettings />;
  }

  return <Stack spacing={2}>This is a WIP page</Stack>;
};
