import { Typography } from "@mui/material";
import { FormCurrencyInput, FormNumericInput } from "@stustapay/form-components";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCurrencyFormatter } from "@/hooks";

import {
  buildStockingDenominationRows,
  computeStockingTotal,
  StockingDenominationRow,
  StockingDenominationValues,
} from "./stockingDenominations";

type StockingMakeupFormTableRow =
  | StockingDenominationRow
  | {
      id: "total";
      field: "total";
      label: string;
      valuePerUnit: null;
      quantity: null;
      amount: number;
    };

const isTotalRow = (row: StockingMakeupFormTableRow): row is Extract<StockingMakeupFormTableRow, { field: "total" }> =>
  row.field === "total";

export type StockingMakeupFormTableProps<T extends StockingDenominationValues> = {
  formik: FormikProps<T>;
  title: string;
  totalLabel: string;
};

export function StockingMakeupFormTable<T extends StockingDenominationValues>({
  formik,
  title,
  totalLabel,
}: StockingMakeupFormTableProps<T>) {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const rows = React.useMemo(() => buildStockingDenominationRows(formik.values), [formik.values]);
  const total = React.useMemo(() => computeStockingTotal(formik.values), [formik.values]);
  const tableRows = React.useMemo(
    (): StockingMakeupFormTableRow[] => [
      ...rows,
      {
        id: "total",
        field: "total",
        label: totalLabel,
        valuePerUnit: null,
        quantity: null,
        amount: total,
      },
    ],
    [rows, total, totalLabel]
  );

  const columns = React.useMemo<GridColDef<StockingMakeupFormTableRow>[]>(
    () => [
      {
        field: "labelKey",
        headerName: t("register.stockingMakeupDenomination"),
        flex: 1,
        sortable: false,
        renderCell: (params) => {
          if (isTotalRow(params.row)) {
            return <Typography sx={{ fontWeight: "bold" }}>{params.row.label}</Typography>;
          }

          return t(params.row.labelKey);
        },
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
          if (isTotalRow(params.row) || params.row.field === "variable_in_euro") {
            return null;
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
          if (isTotalRow(params.row)) {
            return <Typography sx={{ fontWeight: "bold" }}>{formatCurrency(params.row.amount)}</Typography>;
          }

          if (params.row.field === "variable_in_euro") {
            return (
              <FormCurrencyInput
                name="variable_in_euro"
                formik={formik}
                size="small"
                fullWidth={false}
                sx={{ width: 120, "& input": { textAlign: "right" } }}
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
      rows={tableRows}
      columns={columns}
      disableRowSelectionOnClick
      disableColumnMenu
      slots={{
        toolbar: () => <DataGridTitle title={title} />,
      }}
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
}
