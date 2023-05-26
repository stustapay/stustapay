import { MenuItem, Paper, Select, Stack, Typography, FormControl, InputLabel, Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { selectTillAll, useGetProductStatsQuery, useGetTillsQuery, ProductSoldStats } from "@api";
import { Loading } from "@stustapay/components";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Link as RouterLink } from "react-router-dom";

export interface TillStatsTableProps {
  fromTimestamp: null | string;
  toTimestamp: null | string;
}

export const TillStatsTable: React.FC<TillStatsTableProps> = ({ toTimestamp, fromTimestamp }) => {
  const { t } = useTranslation();
  const { data } = useGetProductStatsQuery({
    fromTimestamp: fromTimestamp,
    toTimestamp: toTimestamp,
  });
  const [selectedTill, setSelectedTill] = React.useState<number | null>(null);
  const { data: tills } = useGetTillsQuery();

  if (!data || !tills) {
    return <Loading />;
  }

  const columns: GridColDef<ProductSoldStats>[] = [
    {
      field: "name",
      headerName: t("product.name") as string,
      renderCell: (params) => <RouterLink to={`/products/${params.row.id}`}>{params.row.name}</RouterLink>,
      minWidth: 200,
    },
    {
      field: "quantity_sold",
      headerName: t("overview.quantitySold") as string,
      minWidth: 150,
    },
  ];

  return (
    <Paper>
      <Stack spacing={1}>
        <Box sx={{ p: 1 }}>
          <Typography variant="h5">{t("overview.statsByTill")}</Typography>
        </Box>
        <Box sx={{ p: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t("overview.selectedTill")}</InputLabel>
            <Select
              variant="standard"
              value={selectedTill ?? ""}
              onChange={(e) => setSelectedTill(e.target.value ? Number(e.target.value) : null)}
            >
              {selectTillAll(tills).map((till) => (
                <MenuItem key={till.id} value={till.id}>
                  {till.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <DataGrid
          autoHeight
          rows={selectedTill != null ? data.product_quantities_by_till[selectedTill] ?? [] : []}
          columns={columns}
          disableRowSelectionOnClick
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </Stack>
    </Paper>
  );
};
