import * as React from "react";
import { ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { selectTaxRateAll, useDeleteTaxRateMutation, useListTaxRatesQuery } from "@api";
import { useTranslation } from "react-i18next";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { useNavigate } from "react-router-dom";
import { TaxRate } from "@stustapay/models";
import { Loading } from "@stustapay/components";

export const TaxRateList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { taxRates, isLoading } = useListTaxRatesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      taxRates: data ? selectTaxRateAll(data) : undefined,
    }),
  });
  const [deleteTaxRate] = useDeleteTaxRateMutation();

  const [taxRateToDelete, setTaxRateToDelete] = React.useState<string | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (taxRateName: string) => {
    setTaxRateToDelete(taxRateName);
  };

  const handleConfirmDeleteTaxRate: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && taxRateToDelete !== null) {
      deleteTaxRate({ taxRateName: taxRateToDelete })
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
          onClick={() => navigate(`/tax-rates/${params.row.name}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.name)}
        />,
      ],
    },
  ];

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/tax-rates/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("taxRates")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
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
    </Stack>
  );
};
