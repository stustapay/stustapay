import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TillLayoutRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { TillLayout } from "@/db/api/generated";
import { getTillLayoutCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";

export const TillLayoutList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(TillLayoutRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: layouts, isLoading: isTillsLoading } = useLiveQuery(
    (q) => q.from({ layouts: getTillLayoutCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (layoutId: number) => {
    openModal({
      type: "confirm",
      title: t("layout.delete"),
      content: t("layout.deleteDescription"),
      onConfirm: () => {
        getTillLayoutCollection(currentNode.id).delete(layoutId);
      },
    });
  };

  const columns: GridColDef<TillLayout>[] = [
    {
      field: "name",
      headerName: t("layout.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillLayoutRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("layout.description"),
      flex: 2,
    },
    dataGridNodeColumn,
  ];

  if (canManageNode) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TillLayoutRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    });
  }

  return (
    <ListLayout title={t("layout.layouts")} routes={TillLayoutRoutes}>
      <DataGrid
        autoHeight
        loading={isTillsLoading}
        rows={layouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
