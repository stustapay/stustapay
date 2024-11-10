import { SumUpTransaction, useListSumupTransactionsQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes, SumUpTransactionRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const SumUpTransactionList: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: checkouts } = useListSumupTransactionsQuery({ nodeId: currentNode.id });

  const columns: GridColDef<SumUpTransaction>[] = [
    {
      field: "id",
      headerName: t("common.id") as string,
      width: 300,
      renderCell: (params) => (
        <Link component={RouterLink} to={SumUpTransactionRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
    },
    {
      field: "amount",
      headerName: t("sumup.checkout.amount") as string,
      type: "number",
      valueFormatter: (amount: number, row) => `${amount.toFixed(2)} ${row.currency}`,
    },
    { field: "payment_type", headerName: t("sumup.checkout.payment_type") },
    { field: "timestamp", headerName: t("sumup.checkout.date"), width: 200 },
    { field: "status", headerName: t("sumup.checkout.status") },
    { field: "product_summary", headerName: t("sumup.transaction.product_summary"), flex: 1 },
  ];

  return (
    <ListLayout title={t("sumup.transactions")} routes={ProductRoutes}>
      <DataGrid
        autoHeight
        rows={checkouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        initialState={{
          sorting: {
            sortModel: [{ field: "timestamp", sort: "desc" }],
          },
        }}
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
});
