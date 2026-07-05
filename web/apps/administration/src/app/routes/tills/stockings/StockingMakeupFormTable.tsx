import { Box, Typography } from "@mui/material";
import { FormCurrencyInput, FormNumericInput } from "@stustapay/form-components";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewCashRegisterStocking } from "@/api";
import { useCurrencyFormatter } from "@/hooks";

import { buildStockingDenominationRows, computeStockingTotal, StockingDenominationRow } from "./stockingDenominations";

export type StockingMakeupFormTableProps<T extends NewCashRegisterStocking> = {
  formik: FormikProps<T>;
};

export function StockingMakeupFormTable<T extends NewCashRegisterStocking>({
  formik,
}: StockingMakeupFormTableProps<T>) {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const rows = React.useMemo(() => buildStockingDenominationRows(formik.values), [formik.values]);
  const total = React.useMemo(() => computeStockingTotal(formik.values), [formik.values]);

  const columns = React.useMemo<GridColDef<StockingDenominationRow>[]>(
    () => [
      {
        field: "labelKey",
        headerName: t("register.stockingMakeupDenomination"),
        flex: 1,
        sortable: false,
        valueGetter: (_, row) => t(row.labelKey),
      },
      {
        field: "valuePerUnit",
        headerName: t("register.stockingMakeupValuePerUnit"),
        type: "currency",
        align: "right",
        headerAlign: "right",
        width: 120,
        sortable: false,
        valueFormatter: (value: number | null) => (value == null ? "—" : value),
      },
      {
        field: "quantity",
        headerName: t("register.stockingMakeupQuantity"),
        align: "right",
        headerAlign: "right",
        width: 120,
        sortable: false,
        renderCell: (params) => {
          if (params.row.field === "variable_in_euro") {
            return "—";
          }

          return (
            <FormNumericInput
              name={params.row.field}
              formik={formik}
              size="small"
              fullWidth={false}
              sx={{ width: 96 }}
            />
          );
        },
      },
      {
        field: "amount",
        headerName: t("register.stockingMakeupAmount"),
        align: "right",
        headerAlign: "right",
        width: 150,
        sortable: false,
        renderCell: (params) => {
          if (params.row.field === "variable_in_euro") {
            return (
              <FormCurrencyInput
                name="variable_in_euro"
                formik={formik}
                size="small"
                fullWidth={false}
                sx={{ width: 120 }}
              />
            );
          }

          return formatCurrency(params.row.amount);
        },
      },
    ],
    [t, formik, formatCurrency]
  );

  return (
    <DataGrid
      autoHeight
      hideFooter
      rows={rows}
      columns={columns}
      disableRowSelectionOnClick
      disableColumnMenu
      slots={{
        toolbar: () => (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pr: 1 }}>
            <DataGridTitle title={t("register.stockingMakeup")} />
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {t("register.stockingTotal")}: {formatCurrency(total)}
            </Typography>
          </Box>
        ),
      }}
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
}
