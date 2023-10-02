import { PayoutRunWithStats, selectPayoutRunAll, useListPayoutRunsQuery } from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { PendingPayoutDetail } from "./PendingPayoutDetail";

export const PayoutRunList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();

  const { payoutRuns, isLoading: isPayoutRunsLoading } = useListPayoutRunsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        payoutRuns: data ? selectPayoutRunAll(data) : undefined,
      }),
    }
  );

  if (isPayoutRunsLoading) {
    return <Loading />;
  }

  const columns: GridColDef<PayoutRunWithStats>[] = [
    {
      field: "id",
      headerName: t("payoutRun.id") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={PayoutRunRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
    },
    {
      field: "created_by",
      headerName: t("payoutRun.createdBy") as string,
    },
    {
      field: "created_at",
      headerName: t("payoutRun.createdAt") as string,
      type: "dateTime",
      valueGetter: (params) => new Date(params.row.created_at),
      minWidth: 200,
    },
    {
      field: "total_payout_amount",
      headerName: t("payoutRun.totalPayoutAmount") as string,
      valueFormatter: ({ value }) => formatCurrency(value),
      minWidth: 150,
    },
    {
      field: "total_donation_amount",
      headerName: t("payoutRun.totalDonationAmount") as string,
      valueFormatter: ({ value }) => formatCurrency(value),
      minWidth: 150,
    },
    {
      field: "n_payouts",
      headerName: t("payoutRun.nPayouts") as string,
      type: "number",
      minWidth: 150,
    },
  ];

  return (
    <ListLayout title={t("payoutRun.payoutRuns")} routes={PayoutRunRoutes}>
      <PendingPayoutDetail />
      <DataGrid
        autoHeight
        rows={payoutRuns ?? []}
        columns={columns}
        initialState={{
          sorting: {
            sortModel: [{ field: "created_at", sort: "desc" }],
          },
        }}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
