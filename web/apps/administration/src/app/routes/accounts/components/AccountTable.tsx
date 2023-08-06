import { AccountRoutes, UserTagRoutes } from "@/app/routes";
import { Account } from "@api";
import { useCurrencyFormatter } from "@hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface AccountTableProps {
  accounts: Account[];
}

export const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const columns: GridColDef<Account>[] = [
    {
      field: "name",
      headerName: t("account.name") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={AccountRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
      minWidth: 250,
    },
    {
      field: "type",
      headerName: t("account.type") as string,
      width: 100,
    },
    {
      field: "user_tag_uid_hex",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_uid_hex)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
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
