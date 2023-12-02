import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";
import { Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const NodeOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  if (currentNode.event != null || currentNode.event_node_id != null) {
    return <EventOverview />;
  }

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to={`/node/${currentNode.id}/create-event`}>
        {t("overview.createEvent")}
      </Button>
    </Stack>
  );
};
