import { Typography } from "@mui/material";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { CashRegisterStocking } from "@/api";

import { buildStockingDenominationRows, StockingDenominationRow } from "./stockingDenominations";

export interface StockingMakeupTableProps {
  stocking: CashRegisterStocking;
}

export const StockingMakeupTable: React.FC<StockingMakeupTableProps> = ({ stocking }) => {
  const { t } = useTranslation();
  const rows = React.useMemo(() => buildStockingDenominationRows(stocking, { hideZero: true }), [stocking]);

  const columns = React.useMemo<GridColDef<StockingDenominationRow>[]>(
    () => [
      {
        field: "labelKey",
        headerName: t("register.stockingMakeupDenomination"),
        flex: 1,
        valueGetter: (_, row) => t(row.labelKey),
      },
      {
        field: "valuePerUnit",
        headerName: t("register.stockingMakeupValuePerUnit"),
        type: "currency",
        align: "right",
        headerAlign: "right",
        width: 120,
        valueFormatter: (value: number | null) => (value == null ? "—" : value),
      },
      {
        field: "quantity",
        headerName: t("register.stockingMakeupQuantity"),
        type: "number",
        align: "right",
        headerAlign: "right",
        width: 100,
        valueFormatter: (value: number | null) => (value == null ? "—" : value),
      },
      {
        field: "amount",
        headerName: t("register.stockingMakeupAmount"),
        type: "currency",
        align: "right",
        headerAlign: "right",
        width: 150,
      },
    ],
    [t]
  );

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
        {t("register.stockingMakeupEmpty")}
      </Typography>
    );
  }

  return (
    <DataGrid
      autoHeight
      hideFooter
      rows={rows}
      columns={columns}
      disableRowSelectionOnClick
      slots={{ toolbar: () => <DataGridTitle title={t("register.stockingMakeup")} /> }}
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
