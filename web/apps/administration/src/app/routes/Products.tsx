import * as React from "react";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { useGetProductsQuery } from "../../api";
import { useTranslation } from "react-i18next";

export const Products: React.FC = () => {
  const { t } = useTranslation();

  const { data, error, isLoading } = useGetProductsQuery();
  const columns: GridColDef[] = [
    { field: "name", headerName: t("product name") ?? "" },
    { field: "price", headerName: t("product price") ?? "" },
  ];

  console.log(data);

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
