import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { AccountRead } from "@/api";
import { SystemAccountRoutes, UserTagRoutes } from "@/app/routes";
import { useRenderNode } from "@/hooks";

export interface AccountTableProps {
  accounts: AccountRead[];
  loading?: boolean;
}

export const AccountTable: React.FC<AccountTableProps> = ({ accounts, loading = false }) => {
  const { t } = useTranslation();
  const { dataGridNodeColumn } = useRenderNode();

  const columns: GridColDef<AccountRead>[] = [
    {
      field: "name",
      headerName: t("account.name"),
      renderCell: (params) => (
        <Link component={RouterLink} to={SystemAccountRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "type",
      headerName: t("account.type"),
      width: 100,
    },
    {
      field: "user_tag_id",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      valueGetter: (_, row) => formatUserTagUid(row.user_tag_uid_hex),
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      width: 100,
    },
    {
      field: "comment",
      headerName: t("account.comment"),
      flex: 1,
    },
    {
      field: "balance",
      headerName: t("account.balance"),
      type: "currency",
      width: 250,
    },
    {
      field: "vouchers",
      headerName: t("account.vouchers"),
      type: "number",
      width: 200,
    },
    dataGridNodeColumn,
  ];

  return (
    <DataGrid
      autoHeight
      loading={loading}
      rows={accounts}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
