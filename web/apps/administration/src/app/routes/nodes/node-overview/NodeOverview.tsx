import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";
import { Stack } from "@mui/material";
import { Receipt as ReceiptIcon } from "@mui/icons-material";
import { useGenerateRevenueReportMutation } from "@/api";
import { LoadingButton } from "@mui/lab";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export const NodeOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [generateReport, { isLoading: reportGenerating }] = useGenerateRevenueReportMutation();

  if (currentNode.event != null) {
    return <EventOverview />;
  }

  const openReportPreview = async () => {
    try {
      console.log("starting report preview");
      const resp = await generateReport({
        nodeId: currentNode.id,
      });
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
  };

  return (
    <Stack spacing={2}>
      <LoadingButton
        variant="contained"
        onClick={openReportPreview}
        loading={reportGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("overview.generateRevenueReport")}
      </LoadingButton>
    </Stack>
  );
};
