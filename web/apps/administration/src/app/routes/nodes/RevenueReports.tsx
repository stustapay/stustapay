import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { Stack } from "@mui/material";
import { Receipt as ReceiptIcon } from "@mui/icons-material";
import {
  NodeSeenByUser,
  useGenerateDailyReportMutation,
  useGeneratePayoutReportMutation,
  useGenerateRevenueReportMutation,
} from "@/api";
import { LoadingButton } from "@mui/lab";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { NodeMultiSelect } from "@/components";
import { DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";

async function openReportPreview<T>(args: T, generationFunction: (args: T) => Promise<any>) {
  try {
    console.log(args);
    const resp = await generationFunction(args);
    console.log(resp);
    const pdfUrl = (resp as any).data;
    if (pdfUrl === undefined) {
      console.log(resp);
      toast.error("Error generating report");
    } else {
      window.open(pdfUrl);
    }
  } catch (e) {
    toast.error("Error generating report");
  }
}

export const RevenueReports: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [selectedNodes, setSelectedNodes] = React.useState<NodeSeenByUser[]>([]);
  const [reportDate, setReportDate] = React.useState<string | null>(null);
  const [generateRevenueReport, { isLoading: revenueReportGenerating }] = useGenerateRevenueReportMutation();
  const [generateDailyReport, { isLoading: dailyReportGenerating }] = useGenerateDailyReportMutation();
  const [generatePayoutReport, { isLoading: payoutReportGenerating }] = useGeneratePayoutReportMutation();

  return (
    <Stack spacing={2}>
      <LoadingButton
        variant="contained"
        onClick={async () => await openReportPreview({ nodeId: currentNode.id }, generateRevenueReport)}
        loading={revenueReportGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("overview.generateRevenueReport")}
      </LoadingButton>
      <LoadingButton
        variant="contained"
        onClick={async () => await openReportPreview({ nodeId: currentNode.id }, generatePayoutReport)}
        loading={payoutReportGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("overview.generatePayoutReport")}
      </LoadingButton>

      <NodeMultiSelect value={selectedNodes} onChange={setSelectedNodes} label={t("overview.selectedNodesForReport")} />
      <DatePicker
        value={reportDate ? DateTime.fromISO(reportDate) : null}
        onChange={(value) => {
          const date = value?.toISODate();
          if (date) {
            setReportDate(date);
          }
        }}
        reduceAnimations
        slotProps={{
          textField: {
            variant: "standard",
          },
        }}
      />
      <LoadingButton
        variant="contained"
        onClick={async () => {
          await openReportPreview(
            {
              nodeId: currentNode.id,
              generateDailyReportPayload: {
                relevant_node_ids: selectedNodes.map((node) => node.id),
                report_date: reportDate ?? "", // TODO
              },
            },
            generateDailyReport
          );
        }}
        loading={dailyReportGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("overview.generateDailyReport")}
      </LoadingButton>
    </Stack>
  );
};
