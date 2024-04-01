import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";
import { Stack, Typography } from "@mui/material";

export const NodeOverview: React.FC = () => {
  const { currentNode } = useCurrentNode();

  if (currentNode.event != null) {
    return <EventOverview />;
  }

  return (
    <Stack spacing={2}>
      <Typography>No overview for nodes outside events</Typography>
    </Stack>
  );
};
