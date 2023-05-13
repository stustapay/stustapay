import * as React from "react";
import { Account } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useCurrencyFormatter } from "@hooks";

export interface AccountTableProps {
  accounts: Account[];
}

export const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
  const { t } = useTranslation(["accounts", "common"]);
  const formatCurrency = useCurrencyFormatter();

  const columns: GridColDef<Account>[] = [
    {
      field: "name",
      headerName: t("account.name") as string,
      renderCell: (params) => {
        if (params.row.type === "private") {
          return <RouterLink to={`/customer-accounts/${params.row.id}`}>customer</RouterLink>;
        } else {
          return <RouterLink to={`/system-accounts/${params.row.id}`}>{params.row.name}</RouterLink>;
        }
      },
      width: 200,
    },
    {
      field: "type",
      headerName: t("account.type") as string,
      width: 100,
    },
    {
      field: "user_tag_uid",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      width: 100,
    },
    {
      field: "comment",
      headerName: t("account.comment") as string,
      flex: 1,
    },
    {
      field: "balance",
      headerName: t("account.balance") as string,
      type: "number",
      width: 250,
      valueFormatter: ({ value }) => value && formatCurrency(value),
    },
    {
      field: "vouchers",
      headerName: t("account.vouchers") as string,
      type: "number",
      width: 200,
    },
  ];

  return (
    <DataGrid
      autoHeight
      rows={accounts}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
