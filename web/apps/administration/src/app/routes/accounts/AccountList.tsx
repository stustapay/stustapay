import * as React from "react";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { DataGrid, GridColumns } from "@mui/x-data-grid";
import { selectAccountAll, useGetAccountsQuery } from "@api";
import { useTranslation } from "react-i18next";
import { Account } from "@models";
import { Loading } from "@components/Loading";

export const AccountList: React.FC = () => {
  const { t } = useTranslation(["accounts", "common"]);

  const { products: accounts, isLoading: isAccountsLoading } = useGetAccountsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      products: data ? selectAccountAll(data) : undefined,
    }),
  });

  if (isAccountsLoading) {
    return <Loading />;
  }

  const columns: GridColumns<Account> = [
    {
      field: "name",
      headerName: t("accountName") as string,
      flex: 1,
    },
    {
      field: "type",
      headerName: t("accountType") as string,
      width: 100,
    },
    {
      field: "comment",
      headerName: t("accountComment") as string,
      flex: 4,
    },
    {
      field: "balance",
      headerName: t("accountBalance") as string,
      type: "number",
      valueFormatter: ({ value }) => (value ? `${value} €` : ""),
    },
    // {
    //   field: "actions",
    //   type: "actions",
    //   headerName: t("actions", { ns: "common" }) as string,
    //   width: 150,
    //   getActions: (params) => [],
    // },
  ];

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("accounts", { ns: "common" })} />
        </ListItem>
      </Paper>
      <DataGrid
        autoHeight
        rows={accounts ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </>
  );
};
