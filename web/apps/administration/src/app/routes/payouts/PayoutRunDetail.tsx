import { FileDownload as FileDownloadIcon, Check as CheckIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Link, Alert } from "@mui/material";
import { Loading } from "@stustapay/components";
import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  usePayoutRunCsvExportMutation,
  usePreviousPayoutRunSepaXmlMutation,
  useSetPayoutRunAsDoneMutation,
  useRevokePayoutRunMutation,
} from "@/api";
import { CustomerRoutes, PayoutRunRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView, UserDetailField } from "@/components";
import { LayoutAction } from "@/components/layouts/types";
import { UserTagCell, userTagValueGetter } from "@/components/table/UserTagCell";
import {
  getPayoutRunCollection,
  getPayoutRunPayoutCollection,
  getUserCollection,
  refetchNodeCollection,
} from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { DownloadSepaXMLModal } from "./DownloadSepaXMLModal";

export const PayoutRunDetail: React.FC = () => {
  const { t } = useTranslation();
  const { payoutRunId } = useParams();
  const { currentNode } = useCurrentNode();
  const [showSepaModal, setShowSepaModal] = React.useState(false);

  const openModal = useOpenModal();

  const [csvExport] = usePayoutRunCsvExportMutation();
  const [previousSepa] = usePreviousPayoutRunSepaXmlMutation();
  const [setAsDone, { isLoading: isSetDoneLoading }] = useSetPayoutRunAsDoneMutation();
  const [revoke] = useRevokePayoutRunMutation();
  const {
    data: payoutRun,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ payoutRuns: getPayoutRunCollection(currentNode.id) })
        .where(({ payoutRuns }) => eq(payoutRuns.id, Number(payoutRunId)))
        .join(
          { createdByUsers: getUserCollection(currentNode.id) },
          ({ createdByUsers, payoutRuns }) => eq(payoutRuns.created_by, createdByUsers.id),
          "left" as const
        )
        .join(
          { setDoneByUsers: getUserCollection(currentNode.id) },
          ({ payoutRuns, setDoneByUsers }) => eq(payoutRuns.set_done_by, setDoneByUsers.id),
          "left" as const
        )
        .select(({ createdByUsers, payoutRuns, setDoneByUsers }) => ({
          ...payoutRuns,
          createdByUser: createdByUsers,
          setDoneByUser: setDoneByUsers,
        }))
        .findOne(),
    [currentNode.id, payoutRunId]
  );
  const { data: payouts, isLoading: isPayoutsLoading } = useLiveQuery(
    (q) =>
      q.from({
        payouts: getPayoutRunPayoutCollection(currentNode.id, Number(payoutRunId)),
      }),
    [currentNode.id, payoutRunId]
  );

  if (isError) {
    return <Navigate to={PayoutRunRoutes.list()} />;
  }

  if (isLoading || !payoutRun) {
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

  type PayoutRow = ArrayElement<NonNullable<typeof payouts>>;

  const columns: GridColDef<PayoutRow>[] = [
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
      valueGetter: (_, row) => userTagValueGetter(row),
      renderCell: ({ row }) => <UserTagCell userTag={row} />,
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
            refetchNodeCollection(currentNode.id, "payout-runs");
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
            refetchNodeCollection(currentNode.id, "payout-runs");
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
      loading: isSetDoneLoading,
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
        <UserDetailField
          label={t("payoutRun.createdBy")}
          user={payoutRun.createdByUser}
          fallbackNodeId={payoutRun.node_id}
        />
        <DetailField label={t("payoutRun.createdAt")} value={payoutRun.created_at} />
        {payoutRun.set_done_by != null && payoutRun.set_done_at && (
          <>
            <UserDetailField
              label={t("payoutRun.setDoneBy")}
              user={payoutRun.setDoneByUser}
              fallbackNodeId={payoutRun.node_id}
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
        loading={isPayoutsLoading}
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
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
      <DownloadSepaXMLModal
        show={showSepaModal}
        onClose={() => setShowSepaModal(false)}
        payoutRunId={Number(payoutRunId)}
      />
    </DetailLayout>
  );
};
