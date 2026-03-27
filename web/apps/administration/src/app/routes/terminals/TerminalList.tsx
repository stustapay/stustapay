import {
  Terminal,
  selectEntryAreaById,
  selectTerminalAll,
  selectTillById,
  useListEntryAreasQuery,
  useDeleteTerminalMutation,
  useListTerminalsQuery,
  useListTillsQuery,
} from "@/api";
import { useListHeadwindMappingsQuery } from "@/api/mdm";
import { MdmRoutes, TerminalRoutes, TillRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

const getHeadwindDeviceLabel = (
  deviceName?: string | null,
  deviceNumber?: string | null,
  serial?: string | null,
  id?: string
) => deviceName ?? deviceNumber ?? serial ?? id ?? "";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTerminals = useCurrentUserHasPrivilege(TerminalRoutes.privilege);
  const canManageTerminalsAtNode = useCurrentUserHasPrivilegeAtNode(TerminalRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data
          ? selectTerminalAll(data).filter((terminal) => terminal.node_id === currentNode.id)
          : undefined,
      }),
    }
  );
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: entryAreas, isLoading: isEntryAreasLoading } = useListEntryAreasQuery({ nodeId: currentNode.id });
  const { data: headwindMappings, isLoading: isHeadwindMappingsLoading } = useListHeadwindMappingsQuery({
    nodeId: currentNode.id,
  });
  const [deleteTerminal] = useDeleteTerminalMutation();
  const { dataGridNodeColumn } = useRenderNode();

  if (isTerminalsLoading || isTillsLoading || isEntryAreasLoading || isHeadwindMappingsLoading) {
    return <Loading />;
  }

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillRoutes.detail(till.id, till.node_id)}>
        {till.name}
      </Link>
    );
  };

  const renderEntryArea = (id: number | null) => {
    if (id == null || !entryAreas) {
      return "";
    }
    const entryArea = selectEntryAreaById(entryAreas, id);
    if (!entryArea) {
      return "";
    }
    return entryArea.name;
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    openModal({
      type: "confirm",
      title: t("terminal.delete"),
      content: t("terminal.deleteDescription"),
      onConfirm: () => {
        deleteTerminal({ nodeId: currentNode.id, terminalId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const renderHeadwindDevice = (terminalId: number) => {
    const mapping = headwindMappings?.find((entry) => entry.terminal_id === terminalId);
    if (mapping == null) {
      return "";
    }

    return (
      <Link component={RouterLink} to={MdmRoutes.list(currentNode.id)}>
        {getHeadwindDeviceLabel(
          mapping.headwind_device_name,
          mapping.headwind_device_number,
          mapping.headwind_device_serial,
          mapping.headwind_device_id
        )}
      </Link>
    );
  };

  const columns: GridColDef<Terminal>[] = [
    {
      field: "name",
      headerName: t("common.name"),
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.description}>
          <Link component={RouterLink} to={TerminalRoutes.detail(params.row.id)}>
            {params.row.name}
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "till_id",
      headerName: t("terminal.till"),
      flex: 0.5,
      renderCell: (params) => renderTill(params.row.till_id),
    },
    {
      field: "mode",
      headerName: t("terminal.mode.label"),
      flex: 0.5,
      renderCell: (params) => t(`terminal.mode.${params.row.mode}`),
    },
    {
      field: "self_service",
      headerName: t("terminal.selfService"),
      type: "boolean",
      flex: 0.4,
    },
    {
      field: "entry_area_id",
      headerName: t("entry.area"),
      flex: 0.5,
      renderCell: (params) => renderEntryArea(params.row.entry_area_id ?? null),
    },
    {
      field: "headwind_device",
      headerName: t("mdm.device"),
      flex: 0.8,
      sortable: false,
      renderCell: (params) => renderHeadwindDevice(params.row.id),
    },
    {
      field: "session_uuid",
      headerName: t("terminal.loggedIn"),
      type: "boolean",
      valueGetter: (session_uuid) => session_uuid != null,
    },
    dataGridNodeColumn,
  ];

  if (canManageTerminals) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageTerminalsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TerminalRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="primary"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("terminal.terminals")} routes={TerminalRoutes}>
      <DataGrid
        autoHeight
        rows={terminals ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
