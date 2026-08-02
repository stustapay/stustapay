import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TillLayoutRoutes, TillProfileRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getTillLayoutCollection, getTillProfileCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const TillProfileList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageProfiles = useCurrentUserHasPrivilege(TillProfileRoutes.privilege);
  const canManageProfilesAtNode = useCurrentUserHasPrivilegeAtNode(TillProfileRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: profiles, isLoading: isProfilesLoading } = useLiveQuery(
    (q) =>
      q
        .from({ profiles: getTillProfileCollection(currentNode.id) })
        .join(
          { layouts: getTillLayoutCollection(currentNode.id) },
          ({ layouts, profiles }) => eq(profiles.layout_id, layouts.id),
          "left" as const
        )
        .select(({ profiles, layouts }) => ({
          ...profiles,
          layout: layouts,
        })),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (profileId: number) => {
    openModal({
      type: "confirm",
      title: t("profile.delete"),
      content: t("profile.deleteDescription"),
      onConfirm: () => {
        getTillProfileCollection(currentNode.id).delete(profileId);
      },
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof profiles>>>[] = [
    {
      field: "name",
      headerName: t("profile.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillProfileRoutes.detail(params.row.id, params.row.node_id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("profile.description"),
      flex: 2,
    },
    {
      field: "allow_top_up",
      headerName: t("profile.allowTopUp"),
      type: "boolean",
      width: 120,
    },
    {
      field: "allow_cash_out",
      headerName: t("profile.allowCashOut"),
      type: "boolean",
      width: 120,
    },
    {
      field: "layout",
      headerName: t("profile.layout"),
      flex: 0.5,
      renderCell: (params) =>
        params.row.layout ? (
          <Link component={RouterLink} to={TillLayoutRoutes.detail(params.row.layout.id)}>
            {params.row.layout.name}
          </Link>
        ) : null,
    },
    dataGridNodeColumn,
  ];

  if (canManageProfiles) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageProfilesAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TillProfileRoutes.edit(params.row.id, params.row.node_id))}
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
    <ListLayout title={t("profile.profiles")} routes={TillProfileRoutes}>
      <DataGrid
        autoHeight
        loading={isProfilesLoading}
        rows={profiles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
