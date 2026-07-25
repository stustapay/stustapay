import { Alert, AlertTitle, Skeleton } from "@mui/material";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ListLayout } from "@/components";
import { getTerminalLocationCollection } from "@/db/collections";
import { useCurrentEventSettings, useCurrentNode } from "@/hooks";

import { TerminalMapMarker, TerminalMapView } from "./TerminalMap";

const TerminalOverviewContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data, isLoading, isError } = useLiveQuery(
    (q) => q.from({ locations: getTerminalLocationCollection(currentNode.id) }),
    [currentNode.id],
  );

  if (isError) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("terminal.mdm.locationsLoadFailed")}</AlertTitle>
      </Alert>
    );
  }

  const markers: TerminalMapMarker[] = (data ?? []).map((location) => ({
    id: location.mdm_device_id,
    label: location.terminal_name,
    latitude: location.latitude,
    longitude: location.longitude,
    lastUpdate: location.last_update,
    subtitle: location.mdm_device_id,
    terminalId: location.terminal_id,
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

export const TerminalOverview: React.FC = () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();

  if (!eventSettings.headwind_enabled) {
    return (
      <Alert severity="info">
        <AlertTitle>{t("terminal.mdm.headwindDisabled")}</AlertTitle>
      </Alert>
    );
  }

  return <TerminalOverviewContent />;
};
