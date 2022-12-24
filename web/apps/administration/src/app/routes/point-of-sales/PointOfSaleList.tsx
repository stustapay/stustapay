import * as React from "react";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { useGetPointOfSalesQuery } from "../../../api";

export const PointOfSaleList: React.FC = () => {
  const { data, error, isLoading } = useGetPointOfSalesQuery();
  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "kind", headerName: "Art", flex: 1 },
  ];

  return (
    <DataGrid
      loading={isLoading}
      rows={data ?? []}
      columns={columns}
      autoHeight
      components={{ Toolbar: GridToolbar }}
    />
  );
};
