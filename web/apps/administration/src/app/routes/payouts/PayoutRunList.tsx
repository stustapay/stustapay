import { Check as CheckIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { PayoutRunRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { UserCell, userValueGetter } from "@/components/table/UserCell";
import { getPayoutRunCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { PendingPayoutDetail } from "./PendingPayoutDetail";

export const PayoutRunList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: payoutRuns, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ payoutRun: getPayoutRunCollection(currentNode.id) })
        .join({ user: getUserCollection(currentNode.id) }, ({ payoutRun, user }) => eq(payoutRun.created_by, user.id)),
    [currentNode.id]
  );

  type PayoutRunRow = ArrayElement<NonNullable<typeof payoutRuns>>;

  const columns: GridColDef<PayoutRunRow>[] = [
    {
      field: "payoutRun.id",
      headerName: t("payoutRun.id"),
      minWidth: 50,
      renderCell: (params) => (
        <Link component={RouterLink} to={PayoutRunRoutes.detail(params.row.payoutRun.id)}>
          {params.row.payoutRun.id}
        </Link>
      ),
    },
    {
      field: "payoutRun.created_by",
      headerName: t("payoutRun.createdBy"),
      flex: 1,
      valueGetter: (_, row) => {
        return userValueGetter(row.user);
      },
      renderCell: ({ row }) => <UserCell user={row.user} nodeId={row.payoutRun.node_id} />,
    },
    {
      field: "payoutRun.created_at",
      headerName: t("payoutRun.createdAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      minWidth: 200,
    },
    {
      field: "payoutRun.done",
      headerName: t("common.status"),
      minWidth: 100,
      renderCell: (params) => {
        if (params.row.payoutRun.done) {
          return (
            <>
              <CheckIcon />
              {t("payoutRun.done")}
            </>
          );
        }
        if (params.row.payoutRun.revoked) {
          return (
            <>
              <DeleteIcon />
              {t("payoutRun.revoked")}
            </>
          );
        }
        return "";
      },
    },
    {
      field: "payoutRun.total_payout_amount",
      headerName: t("payoutRun.totalPayoutAmount"),
      type: "currency",
      minWidth: 150,
    },
    {
      field: "payoutRun.total_donation_amount",
      headerName: t("payoutRun.totalDonationAmount"),
      type: "currency",
      minWidth: 150,
    },
    {
      field: "payoutRun.n_payouts",
      headerName: t("payoutRun.nPayouts"),
      type: "number",
      minWidth: 150,
    },
  ];

  return (
    <ListLayout title={t("payoutRun.payoutRuns")} routes={PayoutRunRoutes}>
      <PendingPayoutDetail />
      <DataGrid
        autoHeight
        loading={isLoading}
        rows={payoutRuns ?? []}
        columns={columns}
        getRowId={(row) => row.payoutRun.id}
        initialState={{
          sorting: {
            sortModel: [{ field: "created_at", sort: "desc" }],
          },
        }}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
