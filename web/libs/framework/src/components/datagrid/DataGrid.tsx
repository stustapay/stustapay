/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  DataGrid as MuiDataGrid,
  GridValidRowModel,
  type DataGridProps as MuiDataGridProps,
  type GridColDef as MuiGridColDef,
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridColTypeDef,
} from "@mui/x-data-grid";
import { GridBaseColDef } from "@mui/x-data-grid/internals";
import { useOptionalCurrencyIdentifier } from "../../core/currency/CurrencyProvider";
import { createCurrencyFormatter } from "../../core/currency/createCurrencyFormatter";

export { GridActionsCellItem } from "@mui/x-data-grid";

type GridColDefCurrency<R extends GridValidRowModel = any> = Omit<GridBaseColDef<R>, "type"> & {
  type: "currency";
};

export type GridColDef<R extends GridValidRowModel = any> = MuiGridColDef<R> | GridColDefCurrency<R>;

export type DataGridProps<R extends GridValidRowModel = any> = Omit<MuiDataGridProps<R>, "columns"> &
  React.RefAttributes<HTMLDivElement> & {
    readonly columns: GridColDef<R>[];
  };

const Toolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
};

export const DataGrid = <R extends GridValidRowModel = any>({ columns, ...props }: DataGridProps<R>) => {
  const currencyIdentifier = useOptionalCurrencyIdentifier();

  const modifiedColumns = React.useMemo<MuiGridColDef<R>[]>(() => {
    return columns.map((column): MuiGridColDef<R> => {
      if (column.type === "currency") {
        if (!currencyIdentifier) {
          throw new Error("using a column of type 'currency' requires wrapping the component in a 'CurrencyProvider'");
        }
        const currencyColumn: GridColTypeDef = {
          type: "number",
          align: "right",
          valueFormatter: createCurrencyFormatter(currencyIdentifier),
          cellClassName: "font-tabular-nums",
        };
        return { ...column, ...currencyColumn } as MuiGridColDef<R>;
      }
      return column;
    });
  }, [currencyIdentifier, columns]);

  return (
    <MuiDataGrid
      density="compact"
      disableColumnFilter
      disableColumnSelector
      disableDensitySelector
      slots={{ toolbar: Toolbar }}
      columns={modifiedColumns}
      {...props}
    />
  );
};
