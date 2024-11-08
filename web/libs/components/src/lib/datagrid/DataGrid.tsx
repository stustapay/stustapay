import * as React from "react";
import {
  DataGrid as MuiDataGrid,
  GridValidRowModel,
  DataGridProps as MuiDataGridProps,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";

export { GridActionsCellItem, GridColDef } from "@mui/x-data-grid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridProps<R extends GridValidRowModel = any> = MuiDataGridProps<R> &
  React.RefAttributes<HTMLDivElement>;

const Toolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DataGrid = <R extends GridValidRowModel = any>(props: DataGridProps<R>) => {
  return (
    <MuiDataGrid
      density="compact"
      disableColumnFilter
      disableColumnSelector
      disableDensitySelector
      slots={{ toolbar: Toolbar }}
      {...props}
    />
  );
};
