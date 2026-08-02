import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { TillButtonsRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { TillButton } from "@/db/api/generated";
import { getTillButtonCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const TillButtonList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageButtons = useCurrentUserHasPrivilege(TillButtonsRoutes.privilege);
  const canManageButtonsAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: buttons, isLoading } = useLiveQuery(
    (q) => q.from({ buttons: getTillButtonCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (buttonId: number) => {
    openModal({
      type: "confirm",
      title: t("button.delete"),
      content: t("button.deleteDescription"),
      onConfirm: () => {
        getTillButtonCollection(currentNode.id).delete(buttonId);
        return true;
      },
    });
  };

  const columns: GridColDef<TillButton>[] = [
    {
      field: "name",
      headerName: t("button.name"),
      flex: 1,
    },
    {
      field: "price",
      headerName: t("button.price"),
      type: "currency",
    },
    dataGridNodeColumn,
  ];

  if (canManageButtons) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageButtonsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TillButtonsRoutes.edit(params.row.id, params.row.node_id))}
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
    <ListLayout title={t("button.buttons")} routes={TillButtonsRoutes}>
      <DataGrid
        autoHeight
        loading={isLoading}
        getRowId={(row) => row.name}
        rows={buttons ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
