import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TerminalRoutes, TillProfileRoutes, TillRoutes, TseRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getTerminalCollection, getTillCollection, getTillProfileCollection, getTseCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const TillList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTills = useCurrentUserHasPrivilege(TillRoutes.privilege);
  const canManageTillsAtNode = useCurrentUserHasPrivilegeAtNode(TillRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: tills, isLoading: isTillsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ tills: getTillCollection(currentNode.id) })
        .join(
          { profiles: getTillProfileCollection(currentNode.id) },
          ({ profiles, tills }) => eq(tills.active_profile_id, profiles.id),
          "left" as const
        )
        .join(
          { terminals: getTerminalCollection(currentNode.id) },
          ({ terminals, tills }) => eq(tills.terminal_id, terminals.id),
          "left" as const
        )
        .join(
          { tses: getTseCollection(currentNode.id) },
          ({ tills, tses }) => eq(tills.tse_id, tses.id),
          "left" as const
        )
        .select(({ tills, profiles, terminals, tses }) => ({
          ...tills,
          profile: profiles,
          terminal: terminals,
          tse: tses,
        })),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (tillId: number) => {
    openModal({
      type: "confirm",
      title: t("till.delete"),
      content: t("till.deleteDescription"),
      onConfirm: () => {
        getTillCollection(currentNode.id).delete(tillId);
      },
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof tills>>>[] = [
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
        params.row.tse ? (
          <Link component={RouterLink} to={TseRoutes.detail(params.row.tse.id)}>
            {params.row.tse.name}
          </Link>
        ) : null,
    },
    {
      field: "profile",
      headerName: t("till.profile"),
      flex: 0.5,
      renderCell: (params) =>
        params.row.profile ? (
          <Link component={RouterLink} to={TillProfileRoutes.detail(params.row.profile.id, params.row.profile.node_id)}>
            {params.row.profile.name}
          </Link>
        ) : null,
    },
    {
      field: "terminal_id",
      headerName: t("till.terminal"),
      flex: 0.5,
      renderCell: (params) =>
        params.row.terminal ? (
          <Link component={RouterLink} to={TerminalRoutes.detail(params.row.terminal.id, params.row.terminal.node_id)}>
            {params.row.terminal.name}
          </Link>
        ) : null,
    },
    dataGridNodeColumn,
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
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("till.configuration")} routes={TillRoutes}>
      <DataGrid
        autoHeight
        loading={isTillsLoading}
        rows={tills ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
