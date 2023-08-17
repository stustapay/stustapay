import {
  selectPayoutRunById,
  useLazyPayoutRunCsvExportQuery,
  useLazyPayoutRunSepaXmlExportQuery,
  useListPayoutRunsQuery,
} from "@/api";
import { PayoutRunRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrencyFormatter } from "@/hooks";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

export const PayoutRunDetail: React.FC = () => {
  const { t } = useTranslation();
  const { payoutRunId } = useParams();
  const formatCurrency = useCurrencyFormatter();

  const [csvExport] = useLazyPayoutRunCsvExportQuery();
  const [sepaExport] = useLazyPayoutRunSepaXmlExportQuery();
  const { payoutRun, error } = useListPayoutRunsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      payoutRun: data ? selectPayoutRunById(data, Number(payoutRunId)) : undefined,
    }),
  });

  if (error) {
    return <Navigate to={PayoutRunRoutes.list()} />;
  }

  if (payoutRun === undefined) {
    return <Loading />;
  }

  const downloadCsv = async () => {
    const resp = await csvExport({ payoutRunId: Number(payoutRunId) });
    const data = resp.data;
    if (!data) {
      return;
    }
    const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payout_run_${payoutRunId}_${payoutRun.execution_date}.csv`);
    link.click();
    link.remove();
  };

  const downloadSepa = async () => {
    const resp = await sepaExport({ payoutRunId: Number(payoutRunId) });
    const data = resp.data;
    if (!data) {
      return;
    }
    const url = window.URL.createObjectURL(new Blob([data], { type: "text/xml" }));
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payout_run_${payoutRunId}_${payoutRun.execution_date}_sepa.xml`);
    link.click();
    link.remove();
  };

  return (
    <DetailLayout
      title={String(payoutRun.id)}
      actions={[
        {
          label: t("payoutRun.downloadCsv"),
          onClick: downloadCsv,
          color: "success",
          icon: <FileDownloadIcon />,
        },
        {
          label: t("payoutRun.downloadSepa"),
          onClick: downloadSepa,
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
            <ListItemText primary={t("payoutRun.executionDate")} secondary={payoutRun.execution_date} />
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
    </DetailLayout>
  );
};
