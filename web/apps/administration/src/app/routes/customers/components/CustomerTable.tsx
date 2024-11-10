import { CustomerRead } from "@/api";
import { CustomerRoutes, PayoutRunRoutes, UserTagRoutes } from "@/app/routes";
import { useRenderNode } from "@/hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface CustomerTableProps {
  customers: CustomerRead[];
}

export const CustomerTable: React.FC<CustomerTableProps> = ({ customers }) => {
  const { t } = useTranslation();
  const { dataGridNodeColumn } = useRenderNode();

  const columns: GridColDef<CustomerRead>[] = [
    {
      field: "id",
      headerName: t("account.id"),
      renderCell: (params) => (
        <Link component={RouterLink} to={CustomerRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
    },
    {
      field: "name",
      headerName: t("account.name"),
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
      headerName: t("account.comment"),
    },
    {
      field: "balance",
      headerName: t("account.balance"),
      type: "currency",
      minWidth: 80,
    },
    {
      field: "vouchers",
      headerName: t("account.vouchers"),
      type: "number",
      minWidth: 80,
    },
    {
      field: "email",
      headerName: t("common.email"),
    },
    {
      field: "account_name",
      headerName: t("customer.bankAccountHolder"),
    },
    {
      field: "iban",
      headerName: t("customer.iban"),
    },
    {
      field: "donation",
      headerName: t("customer.donation"),
      type: "currency",
    },
    {
      field: "payout",
      headerName: t("customer.payoutRun"),
      renderCell: (params) =>
        params.row.payout && (
          <Link component={RouterLink} to={PayoutRunRoutes.detail(params.row.payout.payout_run_id)}>
            {params.row.payout.payout_run_id}
          </Link>
        ),
      minWidth: 80,
    },
    dataGridNodeColumn,
  ];

  return (
    <DataGrid
      autoHeight
      rows={customers}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
