import { SumUpCheckout, useListSumupCheckoutsQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes, SumUpTransactionRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const SumUpCheckoutList: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: checkouts } = useListSumupCheckoutsQuery({ nodeId: currentNode.id });

  const columns: GridColDef<SumUpCheckout>[] = [
    {
      field: "checkout_reference",
      headerName: t("sumup.checkout.reference") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={SumUpTransactionRoutes.detail(params.row.checkout_reference)}>
          {params.row.checkout_reference}
        </Link>
      ),
    },
    {
      field: "amount",
      headerName: t("sumup.checkout.amount") as string,
      valueFormatter: (amount, row) => `${amount} ${row.currency}`,
    },
    { field: "date", headerName: t("sumup.checkout.date") },
    { field: "status", headerName: t("sumup.checkout.status") },
  ];

  return (
    <ListLayout title={t("sumup.checkouts")} routes={ProductRoutes}>
      <DataGrid
        autoHeight
        rows={checkouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
});
