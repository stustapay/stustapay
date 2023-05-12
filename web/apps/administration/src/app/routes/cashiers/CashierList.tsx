import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@hooks";
import { Paper, ListItem, FormControlLabel, Checkbox, ListItemText, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { selectCashierAll, selectTillById, useGetCashiersQuery, useGetTillsQuery } from "@api";
import { Cashier } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import { z } from "zod";
import { StringyBoolean, useQueryState } from "@stustapay/utils";

const FilterOptionsSchema = z.object({
  showZeroBalance: StringyBoolean,
  showWithoutTill: StringyBoolean,
});

export const CashierList: React.FC = () => {
  const { t } = useTranslation(["cashiers", "common"]);
  const formatCurrency = useCurrencyFormatter();

  const [filterOptions, setFilterOptions] = useQueryState(
    { showZeroBalance: true, showWithoutTill: true },
    FilterOptionsSchema
  );

  const { cashiers, isLoading: isCashiersLoading } = useGetCashiersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      cashiers: data
        ? selectCashierAll(data).filter((cashier) => {
            if (!filterOptions.showWithoutTill && cashier.till_ids.length === 0) {
              return false;
            }
            if (!filterOptions.showZeroBalance && cashier.cash_drawer_balance === 0) {
              return false;
            }
            return true;
          })
        : undefined,
    }),
  });
  const { data: tills, isLoading: isTillsLoading } = useGetTillsQuery();

  if (isCashiersLoading || isTillsLoading) {
    return <Loading />;
  }

  const renderTill = (id?: number | null) => {
    if (!id || !tills) {
      return "";
    }

    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return <RouterLink to={`/tills/${till.id}`}>{till.name}</RouterLink>;
  };

  const columns: GridColDef<Cashier>[] = [
    {
      field: "login",
      headerName: t("cashier.login") as string,
      renderCell: (params) => <RouterLink to={`/cashiers/${params.row.id}`}>{params.row.login}</RouterLink>,
      flex: 1,
    },
    {
      field: "display_name",
      headerName: t("cashier.name") as string,
      flex: 1,
    },
    {
      field: "description",
      headerName: t("cashier.description") as string,
      type: "string",
      flex: 2,
    },
    {
      field: "till_id",
      headerName: t("cashier.till") as string,
      flex: 0.5,
      minWidth: 150,
      renderCell: (params) => params.row.till_ids.map((till_id) => renderTill(till_id)),
    },
    {
      field: "user_tag_uid",
      headerName: t("cashier.tagId") as string,
      type: "number",
      valueFormatter: ({ value }) => value ?? "",
      width: 150,
    },
    {
      field: "cash_drawer_balance",
      headerName: t("cashier.cashDrawerBalance") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 150,
    },
  ];

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={t("cashiers", { ns: "common" })} />
        </ListItem>
      </Paper>
      <Paper sx={{ p: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={filterOptions.showZeroBalance}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showZeroBalance: evt.target.checked })}
            />
          }
          label={t("cashier.showZeroBalance")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={filterOptions.showWithoutTill}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showWithoutTill: evt.target.checked })}
            />
          }
          label={t("cashier.showWithoutTill")}
        />
      </Paper>
      <DataGrid
        autoHeight
        rows={cashiers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </Stack>
  );
};
