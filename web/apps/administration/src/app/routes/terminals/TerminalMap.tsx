import { Alert, AlertTitle, Skeleton, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Map, { MapRef, Marker, Popup } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";

import { useGetMdmDeviceLocationQuery } from "@/api";
import { useCurrentNode } from "@/hooks";

import "maplibre-gl/dist/maplibre-gl.css";

export type TerminalMapMarker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  lastUpdate: string | null;
  subtitle?: string;
};

export type TerminalMapViewProps = {
  markers: TerminalMapMarker[];
  height?: number;
};

export type TerminalMapProps = {
  mdmDeviceId: string;
  label: string;
};

const DEFAULT_MAP_HEIGHT = 400;

const formatLastUpdate = (lastUpdate: string | null) => {
  if (lastUpdate == null) {
    return null;
  }
  return DateTime.fromISO(lastUpdate).toLocaleString(DateTime.DATETIME_MED);
};

const fitMapToMarkers = (map: MapLibreMap, markers: TerminalMapMarker[]) => {
  if (markers.length === 0) {
    return;
  }

  if (markers.length === 1) {
    map.flyTo({ center: [markers[0].longitude, markers[0].latitude], zoom: 16 });
    return;
  }

  const longitudes = markers.map((marker) => marker.longitude);
  const latitudes = markers.map((marker) => marker.latitude);
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    { padding: 40 }
  );
};

export const TerminalMapView: React.FC<TerminalMapViewProps> = ({ markers, height = DEFAULT_MAP_HEIGHT }) => {
  const { t } = useTranslation();
  const mapRef = React.useRef<MapRef>(null);
  const [selectedMarkerId, setSelectedMarkerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map == null) {
      return;
    }

    fitMapToMarkers(map, markers);
  }, [markers]);

  if (markers.length === 0) {
    return (
      <Alert severity="info">
        <AlertTitle>{t("terminal.mdm.noLocationsAvailable")}</AlertTitle>
      </Alert>
    );
  }

  const initialMarker = markers[0];

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: initialMarker.longitude,
        latitude: initialMarker.latitude,
        zoom: markers.length === 1 ? 16 : 12,
      }}
      style={{ width: "100%", height }}
      mapStyle="https://tiles.openfreemap.org/styles/bright"
      onLoad={(event) => fitMapToMarkers(event.target, markers)}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="bottom"
          onClick={(event) => {
            event.originalEvent.stopPropagation();
            setSelectedMarkerId(marker.id);
          }}
        />
      ))}

      {selectedMarkerId != null &&
        (() => {
          const marker = markers.find((item) => item.id === selectedMarkerId);
          if (marker == null) {
            return null;
          }

          const formattedLastUpdate = formatLastUpdate(marker.lastUpdate);

          return (
            <Popup
              anchor="top"
              longitude={marker.longitude}
              latitude={marker.latitude}
              onClose={() => setSelectedMarkerId(null)}
            >
              <Typography variant="h6">{marker.label}</Typography>
              {formattedLastUpdate != null && (
                <Typography variant="body2">
                  {t("terminal.mdm.locationLastUpdate", { lastUpdate: formattedLastUpdate })}
                </Typography>
              )}
              {marker.subtitle != null && (
                <Typography variant="body2" color="text.secondary">
                  {marker.subtitle}
                </Typography>
              )}
            </Popup>
          );
        })()}
    </Map>
  );
};

export const TerminalMap: React.FC<TerminalMapProps> = ({ mdmDeviceId, label }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: location, isLoading, error } = useGetMdmDeviceLocationQuery({ nodeId: currentNode.id, mdmDeviceId });

  if (isLoading) {
    return <Skeleton variant="rounded" width="100%" height={DEFAULT_MAP_HEIGHT} />;
  }

  if (error || !location) {
    return (
      <Alert severity="warning">
        <AlertTitle>{t("terminal.mdm.locationLoadFailed")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <TerminalMapView
      markers={[
        {
          id: mdmDeviceId,
          label,
          latitude: location.latitude,
          longitude: location.longitude,
          lastUpdate: location.last_update,
        },
      ]}
    />
  );
};
