import { Edit as EditIcon, Map as MapIcon } from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { TerminalRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { MdmDeviceChangeMapping } from "@/components/features";
import { MdmDeviceWithMapping } from "@/db/api/generated";
import { getMdmDeviceCollection } from "@/db/collections";
import { useCurrentEventSettings, useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";

import { TerminalMap } from "./TerminalMap";

const MdmDeviceListContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTerminals = useCurrentUserHasPrivilege(TerminalRoutes.privilege);
  const { data, isLoading, isError } = useLiveQuery(
    (q) => q.from({ devices: getMdmDeviceCollection(currentNode.id) }),
    [currentNode.id]
  );
  const [selectedDevice, setSelectedDevice] = React.useState<MdmDeviceWithMapping | null>(null);
  const [mapDevice, setMapDevice] = React.useState<MdmDeviceWithMapping | null>(null);

  const mappedTerminalIds = React.useMemo(
    () => new Set((data ?? []).flatMap((device) => (device.mapping ? [device.mapping.terminal_id] : []))),
    [data]
  );

  if (isError) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("terminal.mdm.loadFailed")}</AlertTitle>
      </Alert>
    );
  }

  const columns: GridColDef<ArrayElement<NonNullable<typeof data>>>[] = [
    {
      field: "device_id",
      headerName: t("terminal.mdm.deviceId"),
      flex: 1,
      valueGetter: (_, row) => row.device.device_id,
    },
    {
      field: "status",
      headerName: t("terminal.mdm.status"),
      flex: 1,
      valueGetter: (_, row) => row.device.status,
      renderCell: ({ row }) => {
        return (
          <Chip
            sx={{
              backgroundColor: (theme) =>
                row.device.status === "online"
                  ? theme.palette.success.main
                  : row.device.status === "offline"
                    ? theme.palette.error.main
                    : theme.palette.info.main,
            }}
            label={row.device.status}
          />
        );
      },
    },
    {
      field: "serial",
      headerName: t("terminal.mdm.serial"),
      flex: 1,
      valueGetter: (_, row) => row.device.serial ?? "",
    },
    {
      field: "model",
      headerName: t("terminal.mdm.model"),
      flex: 0.5,
      valueGetter: (_, row) => row.device.model ?? "",
    },
    {
      field: "ip_address",
      headerName: t("terminal.mdm.ipAddress"),
      flex: 1,
      valueGetter: (_, row) => row.device.ip_address ?? "",
    },
    {
      field: "terminal",
      headerName: t("terminal.terminals"),
      flex: 1,
      renderCell: ({ row }) => {
        if (!row.mapping) {
          return t("terminal.mdm.unmapped");
        }
        return (
          <Link component={RouterLink} to={TerminalRoutes.detail(row.mapping.terminal_id)}>
            {row.mapping.terminal_name}
          </Link>
        );
      },
    },
  ];

  columns.push({
    field: "actions",
    type: "actions",
    headerName: t("actions"),
    width: canManageTerminals ? 120 : 60,
    getActions: (params) => [
      <GridActionsCellItem
        icon={<MapIcon />}
        color="primary"
        label={t("terminal.mdm.showLocation")}
        disabled={params.row.device.location_last_update == null}
        onClick={() => setMapDevice(params.row)}
      />,
      ...(canManageTerminals
        ? [
            <GridActionsCellItem
              icon={<EditIcon />}
              color="primary"
              label={t("terminal.mdm.changeMapping")}
              onClick={() => setSelectedDevice(params.row)}
            />,
          ]
        : []),
    ],
  });

  return (
    <>
      <ListLayout title={t("terminal.mdmDevices")}>
        <DataGrid
          loading={isLoading}
          getRowId={(row) => row.device.device_id}
          rows={data ?? []}
          columns={columns}
          disableRowSelectionOnClick
          sx={{ boxShadow: (theme) => theme.shadows[1] }}
        />
      </ListLayout>
      {selectedDevice && (
        <MdmDeviceChangeMapping
          device={selectedDevice}
          mappedTerminalIds={mappedTerminalIds}
          open={selectedDevice != null}
          onClose={() => setSelectedDevice(null)}
        />
      )}
      <Dialog open={mapDevice != null} onClose={() => setMapDevice(null)} maxWidth="md" fullWidth>
        <DialogTitle>{mapDevice?.mapping?.terminal_name ?? mapDevice?.device.device_id}</DialogTitle>
        <DialogContent>
          {mapDevice && (
            <TerminalMap
              mdmDeviceId={mapDevice.device.device_id}
              label={mapDevice.mapping?.terminal_name ?? mapDevice.device.device_id}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDevice(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const MdmDeviceList: React.FC = () => {
  const { t } = useTranslation();
  const { eventSettings } = useCurrentEventSettings();

  if (!eventSettings.headwind_enabled) {
    return (
      <Alert severity="info">
        <AlertTitle>{t("terminal.mdm.headwindDisabled")}</AlertTitle>
      </Alert>
    );
  }

  return <MdmDeviceListContent />;
};
