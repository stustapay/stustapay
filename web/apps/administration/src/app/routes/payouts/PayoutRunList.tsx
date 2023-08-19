import { PayoutRunWithStats, selectPayoutRunAll, useListPayoutRunsQuery } from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrencyFormatter } from "@hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { PendingPayoutDetail } from "./PendingPayoutDetail";

export const PayoutRunList: React.FC = () => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const { payoutRuns, isLoading: isPayoutRunsLoading } = useListPayoutRunsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      payoutRuns: data ? selectPayoutRunAll(data) : undefined,
    }),
  });
  //   const [deletePayoutRun] = useDeletePayoutRunMutation();

  //   const [tseToDelete, setPayoutRunToDelete] = React.useState<number | null>(null);
  if (isPayoutRunsLoading) {
    return <Loading />;
  }

  //   const openConfirmDeleteDialog = (tseId: number) => {
  //     setPayoutRunToDelete(tseId);
  //   };

  //   const handleConfirmDeletePayoutRun: ConfirmDialogCloseHandler = (reason) => {
  //     if (reason === "confirm" && tseToDelete !== null) {
  //       deletePayoutRun({ tseId: tseToDelete })
  //         .unwrap()
  //         .catch(() => undefined);
  //     }
  //     setPayoutRunToDelete(null);
  //   };

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
    // {
    //   field: "actions",
    //   type: "actions",
    //   headerName: t("actions") as string,
    //   width: 150,
    //   getActions: (params) => [
    //     <GridActionsCellItem
    //       icon={<EditIcon />}
    //       color="primary"
    //       label={t("edit")}
    //       onClick={() => navigate(PayoutRunRoutes.edit(params.row.tse_id))}
    //     />,
    //     <GridActionsCellItem
    //       icon={<DeleteIcon />}
    //       color="error"
    //       label={t("delete")}
    //       onClick={() => openConfirmDeleteDialog(params.row.id)}
    //     />,
    //   ],
    // },
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
      {/* <ConfirmDialog
        title={t("tse.delete")}
        body={t("tse.deleteDescription")}
        show={tseToDelete !== null}
        onClose={handleConfirmDeletePayoutRun}
      /> */}
    </ListLayout>
  );
};
