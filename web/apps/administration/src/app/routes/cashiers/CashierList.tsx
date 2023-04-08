import * as React from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@hooks";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { DataGrid, GridColumns } from "@mui/x-data-grid";
import { selectCashierAll, selectTillById, useGetCashiersQuery, useGetTillsQuery } from "@api";
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

  const columns: GridColumns<Cashier> = [
    {
      field: "name",
      headerName: t("cashier.name") as string,
      renderCell: (params) => <RouterLink to={`/cashiers/${params.row.id}`}>{params.row.name}</RouterLink>,
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
      field: "till_id",
      headerName: t("cashier.till") as string,
      flex: 0.5,
      renderCell: (params) => renderTill(params.row.till_id),
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
