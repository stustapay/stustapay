import {
  selectPayoutRunById,
  useListPayoutRunsQuery,
  usePayoutRunCsvExportMutation,
  usePayoutRunPayoutsQuery,
  PayoutRead,
  usePreviousPayoutRunSepaXmlMutation,
  useSetPayoutRunAsDoneMutation,
  useRevokePayoutRunMutation,
  useListUsersQuery,
  selectUserById,
} from "@/api";
import { CustomerRoutes, PayoutRunRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { FileDownload as FileDownloadIcon, Check as CheckIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Link, Alert } from "@mui/material";
import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { DownloadSepaXMLModal } from "./DownloadSepaXMLModal";
import { formatUserTagUid, getUserName } from "@stustapay/models";
import { LayoutAction } from "@/components/layouts/types";
import { useOpenModal } from "@stustapay/modal-provider";

export const PayoutRunDetail: React.FC = () => {
  const { t } = useTranslation();
  const { payoutRunId } = useParams();
  const { currentNode } = useCurrentNode();
  const [showSepaModal, setShowSepaModal] = React.useState(false);

  const openModal = useOpenModal();

  const [csvExport] = usePayoutRunCsvExportMutation();
  const [previousSepa] = usePreviousPayoutRunSepaXmlMutation();
  const [setAsDone] = useSetPayoutRunAsDoneMutation();
  const [revoke] = useRevokePayoutRunMutation();
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
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });

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
      }).unwrap();
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bank_export__run_${payoutRunId}.csv`);
      link.click();
      link.remove();
    } catch {
      toast.error("Error downloading csv");
    }
  };

  const downloadPreviousSepa = async () => {
    try {
      const data = await previousSepa({
        nodeId: currentNode.id,
        payoutRunId: Number(payoutRunId),
      }).unwrap();
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/xml" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `sepa__run_${payoutRunId}.xml`);
      link.click();
      link.remove();
    } catch {
      toast.error("Error downloading csv");
    }
  };

  const columns: GridColDef<PayoutRead>[] = [
    {
      field: "customer_account_id",
      headerName: t("common.id"),
      renderCell: (params) => (
        <Link component={RouterLink} to={CustomerRoutes.detail(params.row.customer_account_id)}>
          {params.row.customer_account_id}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "account_name",
      headerName: t("customer.bankAccountHolder"),
      flex: 1,
    },
    {
      field: "email",
      headerName: t("email"),
      flex: 1,
    },
    {
      field: "user_tag_id",
      headerName: t("account.user_tag_uid") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      minWidth: 300,
    },
    {
      field: "amount",
      headerName: t("common.amount"),
      type: "currency",
      width: 150,
    },
    {
      field: "donation",
      headerName: t("common.donation"),
      type: "currency",
      width: 150,
    },
  ];

  const handleSetDone = () => {
    openModal({
      type: "confirm",
      title: t("payoutRun.setDone"),
      content: t("payoutRun.setDoneExplanation"),
      onConfirm: () => {
        setAsDone({ nodeId: currentNode.id, payoutRunId: payoutRun.id })
          .unwrap()
          .then(() => {
            toast.success("Payout run set as done");
          })
          .catch(() => {
            toast.error("Error setting the payout run as done");
          });
        return true;
      },
    });
  };

  const handleRevoke = () => {
    openModal({
      type: "confirm",
      title: t("payoutRun.revoke"),
      content: t("payoutRun.revokeExplanation"),
      onConfirm: () => {
        revoke({ nodeId: currentNode.id, payoutRunId: payoutRun.id })
          .unwrap()
          .then(() => {
            toast.success("Payout run revoked");
          })
          .catch(() => {
            toast.error("Error revoking the payout");
          });
        return true;
      },
    });
  };

  const actions: LayoutAction[] = [
    {
      label: t("payoutRun.setDone"),
      onClick: handleSetDone,
      color: "success",
      icon: <CheckIcon />,
      disabled: payoutRun.done || payoutRun.revoked,
    },
    {
      label: t("payoutRun.revoke"),
      onClick: handleRevoke,
      color: "error",
      icon: <DeleteIcon />,
      disabled: payoutRun.done || payoutRun.revoked,
    },
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
      disabled: payoutRun.done || payoutRun.revoked,
    },
    {
      label: t("payoutRun.downloadPreviousSepa"),
      onClick: downloadPreviousSepa,
      disabled: !payoutRun.sepa_was_generated,
      color: "success",
      icon: <FileDownloadIcon />,
    },
  ];

  return (
    <DetailLayout title={String(payoutRun.id)} routes={PayoutRunRoutes} actions={actions}>
      <DetailView>
        {payoutRun.done && <Alert severity="success">{t("payoutRun.done")}</Alert>}
        {payoutRun.revoked && <Alert severity="warning">{t("payoutRun.revoked")}</Alert>}
        <DetailField
          label={t("payoutRun.createdBy")}
          value={users && payoutRun.created_by != null && getUserName(selectUserById(users, payoutRun.created_by))}
          linkTo={UserRoutes.detail(payoutRun.created_by)}
        />
        <DetailField label={t("payoutRun.createdAt")} value={payoutRun.created_at} />
        {payoutRun.set_done_by != null && payoutRun.set_done_at && (
          <>
            <DetailField
              label={t("payoutRun.setDoneBy")}
              value={users && getUserName(selectUserById(users, payoutRun.set_done_by))}
              linkTo={UserRoutes.detail(payoutRun.created_by)}
            />
            <DetailField label={t("payoutRun.setDoneAt")} value={payoutRun.set_done_at} />
          </>
        )}
        <DetailNumberField
          label={t("payoutRun.totalDonationAmount")}
          type="currency"
          value={payoutRun.total_donation_amount}
        />
        <DetailNumberField
          label={t("payoutRun.totalPayoutAmount")}
          type="currency"
          value={payoutRun.total_payout_amount}
        />
        <DetailField label={t("payoutRun.nPayouts")} value={payoutRun.n_payouts} />
      </DetailView>
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
