import {
  Till,
  selectTerminalById,
  selectTillAll,
  selectTillProfileById,
  useDeleteTillMutation,
  useListTerminalsQuery,
  useListTillProfilesQuery,
  useListTillsQuery,
} from "@/api";
import { TerminalRoutes, TillProfileRoutes, TillRoutes, TseRoutes } from "@/app/routes";
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

export const TillList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTills = useCurrentUserHasPrivilege(TillRoutes.privilege);
  const canManageTillsAtNode = useCurrentUserHasPrivilegeAtNode(TillRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { tills, isLoading: isTillsLoading } = useListTillsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tills: data ? selectTillAll(data) : undefined,
      }),
    }
  );
  const { data: profiles, isLoading: isProfilesLoading } = useListTillProfilesQuery({ nodeId: currentNode.id });
  const { data: terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery({ nodeId: currentNode.id });
  const [deleteTill] = useDeleteTillMutation();
  const renderNode = useRenderNode();

  if (isTillsLoading || isProfilesLoading || isTerminalsLoading) {
    return <Loading />;
  }

  const renderProfile = (id: number | null) => {
    if (id == null || !profiles) {
      return "";
    }
    const profile = selectTillProfileById(profiles, id);
    if (!profile) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillProfileRoutes.detail(profile.id)}>
        {profile.name}
      </Link>
    );
  };

  const renderTerminal = (id?: number | null) => {
    if (id == null || !terminals) {
      return "";
    }
    const terminal = selectTerminalById(terminals, id);
    if (!terminal) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TerminalRoutes.detail(terminal.id)}>
        {terminal.name}
      </Link>
    );
  };

  const openConfirmDeleteDialog = (tillId: number) => {
    openModal({
      type: "confirm",
      title: t("till.delete"),
      content: t("till.deleteDescription"),
      onConfirm: () => {
        deleteTill({ nodeId: currentNode.id, tillId })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const columns: GridColDef<Till>[] = [
    {
      field: "name",
      headerName: t("till.name"),
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.description}>
          <Link component={RouterLink} to={TillRoutes.detail(params.row.id, params.row.node_id)}>
            {params.row.name}
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "tse_id",
      headerName: t("till.tseId"),
      minWidth: 150,
      renderCell: (params) =>
        params.row.tse_id != null && (
          <Link component={RouterLink} to={TseRoutes.detail(params.row.tse_id)}>
            {params.row.tse_id}
          </Link>
        ),
    },
    {
      field: "profile",
      headerName: t("till.profile"),
      flex: 0.5,
      renderCell: (params) => renderProfile(params.row.active_profile_id),
    },
    {
      field: "terminal_id",
      headerName: t("till.terminal"),
      flex: 0.5,
      renderCell: (params) => renderTerminal(params.row.terminal_id),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode"),
      valueFormatter: (value) => renderNode(value),
      minWidth: 200,
    },
  ];

  if (canManageTills) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageTillsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TillRoutes.edit(params.row.id, params.row.node_id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="error"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("tills")} routes={TillRoutes}>
      <DataGrid
        autoHeight
        rows={tills ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
