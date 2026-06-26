import { Alert, AlertTitle, Skeleton } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useListTerminalLocationsQuery } from "@/api";
import { ListLayout } from "@/components";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";

import { TerminalMapView } from "./TerminalMap";

export const TerminalOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { eventSettings } = useCurrentEventSettings();
  const { data, isLoading, error } = useListTerminalLocationsQuery(
    { nodeId: currentNode.id },
    { skip: !eventSettings.headwind_enabled }
  );

  if (!eventSettings.headwind_enabled) {
    return (
      <Alert severity="info">
        <AlertTitle>{t("terminal.mdm.headwindDisabled")}</AlertTitle>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("terminal.mdm.locationsLoadFailed")}</AlertTitle>
      </Alert>
    );
  }

  const markers = (data ?? []).map((location) => ({
    id: location.mdm_device_id,
    label: location.terminal_name,
    latitude: location.latitude,
    longitude: location.longitude,
    lastUpdate: location.last_update,
    subtitle: location.mdm_device_id,
  }));

  return (
    <ListLayout title={t("terminal.overview")}>
      {isLoading ? (
        <Skeleton variant="rounded" width="100%" height={600} />
      ) : (
        <TerminalMapView markers={markers} height={600} />
      )}
    </ListLayout>
  );
};
