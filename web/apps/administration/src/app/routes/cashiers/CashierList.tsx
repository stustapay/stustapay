import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@hooks";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { DataGrid, GridColumns } from "@mui/x-data-grid";
import { selectCashierAll, useGetCashiersQuery } from "@api";
import { Cashier } from "@models";
import { Loading } from "@components";

export const CashierList: React.FC = () => {
  const { t } = useTranslation(["cashiers", "common"]);
  const formatCurrency = useCurrencyFormatter();
  const { cashiers, isLoading: isCashiersLoading } = useGetCashiersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      cashiers: data ? selectCashierAll(data) : undefined,
    }),
  });

  if (isCashiersLoading) {
    return <Loading />;
  }

  const columns: GridColumns<Cashier> = [
    {
      field: "name",
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
      field: "user_tag_id",
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
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("cashiers", { ns: "common" })} />
        </ListItem>
      </Paper>
      <DataGrid
        autoHeight
        rows={cashiers ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </>
  );
};
