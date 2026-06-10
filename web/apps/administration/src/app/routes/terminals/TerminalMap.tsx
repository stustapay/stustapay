import { useGetMdmDeviceLocationQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Alert, AlertTitle, Skeleton, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export type TerminalMapProps = {
  mdmDeviceId: string;
  label: string;
};

const MAP_HEIGHT = 400;

export const TerminalMap: React.FC<TerminalMapProps> = ({ mdmDeviceId, label }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [popupShown, setPopupShown] = React.useState(false);

  const { data: location, isLoading, error } = useGetMdmDeviceLocationQuery({ nodeId: currentNode.id, mdmDeviceId });

  if (isLoading) {
    return <Skeleton variant="rounded" width="100%" height={MAP_HEIGHT} />;
  }

  if (error || !location) {
    return (
      <Alert severity="warning">
        <AlertTitle>{t("terminal.mdm.locationLoadFailed")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Map
      initialViewState={{
        longitude: location.longitude,
        latitude: location.latitude,
        zoom: 16,
      }}
      style={{ width: "100%", height: MAP_HEIGHT }}
      mapStyle="https://tiles.openfreemap.org/styles/bright"
    >
      <Marker
        longitude={location.longitude}
        latitude={location.latitude}
        anchor="bottom"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setPopupShown(true);
        }}
      />

      {popupShown && (
        <Popup
          anchor="top"
          longitude={location.longitude}
          latitude={location.latitude}
          onClose={() => setPopupShown(false)}
        >
          <Typography variant="h6">{label}</Typography>
          {location.last_update != null && <Typography variant="body2">{location.last_update}</Typography>}
        </Popup>
      )}
    </Map>
  );
};
