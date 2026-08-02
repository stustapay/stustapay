import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { TaxRate } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getTaxRateCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const TaxRateList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const canManageTaxRatesAtNode = useCurrentUserHasPrivilegeAtNode(TaxRateRoutes.privilege);
  const openModal = useOpenModal();

  const { data: taxRates, isLoading } = useLiveQuery(
    (q) => q.from({ taxRates: getTaxRateCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (taxRateId: number) => {
    openModal({
      type: "confirm",
      title: t("deleteTaxRate"),
      content: t("deleteTaxRateDescription"),
      onConfirm: () => {
        getTaxRateCollection(currentNode.id).delete(taxRateId);
        return true;
      },
    });
  };

  const columns: GridColDef<TaxRate>[] = [
    {
      field: "name",
      headerName: t("taxRateName"),
      width: 100,
    },
    {
      field: "description",
      headerName: t("taxRateDescription"),
      flex: 1,
    },
    {
      field: "rate",
      headerName: t("taxRateRate"),
      align: "right",
      type: "number",
      valueGetter: (rate) => rate * 100,
      valueFormatter: (value: number) => `${value.toFixed(2)} %`,
    },
    dataGridNodeColumn,
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageTaxRatesAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TaxRateRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    },
  ];

  return (
    <ListLayout title={t("taxRates")} routes={TaxRateRoutes}>
      <DataGrid
        autoHeight
        loading={isLoading}
        getRowId={(row) => row.name}
        rows={taxRates ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
