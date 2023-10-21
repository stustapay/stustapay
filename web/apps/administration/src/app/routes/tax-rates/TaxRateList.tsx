import { TaxRate, selectTaxRateAll, useDeleteTaxRateMutation, useListTaxRatesQuery } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const TaxRateList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const { taxRates, isLoading } = useListTaxRatesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        taxRates: data ? selectTaxRateAll(data) : undefined,
      }),
    }
  );
  const [deleteTaxRate] = useDeleteTaxRateMutation();

  const [taxRateToDelete, setTaxRateToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (taxRateId: number) => {
    setTaxRateToDelete(taxRateId);
  };

  const handleConfirmDeleteTaxRate: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && taxRateToDelete !== null) {
      deleteTaxRate({ nodeId: currentNode.id, taxRateId: taxRateToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setTaxRateToDelete(null);
  };

  const columns: GridColDef<TaxRate>[] = [
    {
      field: "name",
      headerName: t("taxRateName") as string,
      width: 100,
    },
    {
      field: "description",
      headerName: t("taxRateDescription") as string,
      flex: 1,
    },
    {
      field: "rate",
      headerName: t("taxRateRate") as string,
      align: "right",
      type: "number",
      valueGetter: (params) => params.row.rate * 100,
      valueFormatter: ({ value }) => `${value.toFixed(2)} %`,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TaxRateRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <ListLayout title={t("taxRates")} routes={TaxRateRoutes}>
      <DataGrid
        autoHeight
        getRowId={(row) => row.name}
        rows={taxRates ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("deleteTaxRate")}
        body={t("deleteTaxRateDescription")}
        show={taxRateToDelete !== null}
        onClose={handleConfirmDeleteTaxRate}
      />
    </ListLayout>
  );
};
