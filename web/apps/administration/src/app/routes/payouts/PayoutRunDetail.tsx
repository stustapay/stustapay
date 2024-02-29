import {
  PayoutRead,
  selectPayoutRunById,
  useListPayoutRunsQuery,
  usePayoutRunCsvExportMutation,
  usePayoutRunPayoutsQuery,
} from "@/api";
import { CustomerRoutes, PayoutRunRoutes, UserTagRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper, Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle, Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { DownloadSepaXMLModal } from "./DownloadSepaXMLModal";

export const PayoutRunDetail: React.FC = () => {
  const { t } = useTranslation();
  const { payoutRunId } = useParams();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const [showSepaModal, setShowSepaModal] = React.useState(false);

  const [csvExport] = usePayoutRunCsvExportMutation();
  const { payoutRun, error } = useListPayoutRunsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        payoutRun: data ? selectPayoutRunById(data, Number(payoutRunId)) : undefined,
      }),
    }
  );
  const { data: payouts } = usePayoutRunPayoutsQuery({ nodeId: currentNode.id, payoutRunId: Number(payoutRunId) });

  if (error) {
    return <Navigate to={PayoutRunRoutes.list()} />;
  }

  if (payoutRun === undefined) {
    return <Loading />;
  }

  const downloadCsv = async () => {
    try {
      const data = await csvExport({
        nodeId: currentNode.id,
        payoutRunId: Number(payoutRunId),
        createCsvPayload: {},
      }).unwrap();
      const url = window.URL.createObjectURL(new Blob([data[0]], { type: "text/csv" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bank_export__run_${payoutRunId}.csv`);
      link.click();
      link.remove();
    } catch {
      toast.error("Error downloading csv");
    }
  };

  const columns: GridColDef<PayoutRead>[] = [
    {
      field: "customer_account_id",
      headerName: t("customer.bankAccountHolder") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={CustomerRoutes.detail(params.row.customer_account_id)}>
          {params.row.account_name}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "email",
      headerName: t("email") as string,
      flex: 1,
    },
    {
      field: "user_tag_uid",
      headerName: t("account.user_tag_uid") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_uid_hex)}>
          {params.row.user_tag_uid_hex}
        </Link>
      ),
      minWidth: 300,
    },
    {
      field: "balance",
      headerName: t("account.balance") as string,
      align: "right",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 150,
    },
  ];

  return (
    <DetailLayout
      title={String(payoutRun.id)}
      routes={PayoutRunRoutes}
      actions={[
        {
          label: t("payoutRun.downloadCsv"),
          onClick: downloadCsv,
          color: "success",
          icon: <FileDownloadIcon />,
        },
        {
          label: t("payoutRun.downloadSepa"),
          onClick: () => setShowSepaModal(true),
          color: "success",
          icon: <FileDownloadIcon />,
        },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("payoutRun.createdBy")} secondary={payoutRun.created_by} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("payoutRun.createdAt")} secondary={payoutRun.created_at} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("payoutRun.totalDonationAmount")}
              secondary={formatCurrency(payoutRun.total_donation_amount)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("payoutRun.totalPayoutAmount")}
              secondary={formatCurrency(payoutRun.total_payout_amount)}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("payoutRun.nPayouts")} secondary={payoutRun.n_payouts} />
          </ListItem>
        </List>
      </Paper>
      <DataGrid
        autoHeight
        rows={payouts ?? []}
        getRowId={(row) => row.customer_account_id}
        initialState={{
          sorting: {
            sortModel: [{ field: "customer_account_id", sort: "desc" }],
          },
        }}
        slots={{ toolbar: () => <DataGridTitle title={t("payoutRun.payoutsInPayoutRun")} /> }}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <DownloadSepaXMLModal
        show={showSepaModal}
        onClose={() => setShowSepaModal(false)}
        payoutRunId={Number(payoutRunId)}
      />
    </DetailLayout>
  );
};
