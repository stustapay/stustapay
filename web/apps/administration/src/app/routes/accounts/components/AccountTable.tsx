import { AccountRead } from "@/api";
import { AccountRoutes, UserTagRoutes } from "@/app/routes";
import { useRenderNode } from "@/hooks";
import { Link } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { formatUserTagUid } from "@stustapay/models";
import { DataGrid, GridColDef } from "@stustapay/framework";

export interface AccountTableProps {
  accounts: AccountRead[];
}

export const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
  const { t } = useTranslation();
  const renderNode = useRenderNode();

  const columns: GridColDef<AccountRead>[] = [
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
      field: "user_tag_id",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
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
      type: "currency",
      width: 250,
    },
    {
      field: "vouchers",
      headerName: t("account.vouchers") as string,
      type: "number",
      width: 200,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
      flex: 1,
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
