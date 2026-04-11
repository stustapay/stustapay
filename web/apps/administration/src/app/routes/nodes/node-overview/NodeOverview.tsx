import { useGenerateRevenueReportMutation } from "@/api";
import { useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";
import { Stack } from "@mui/material";
import { Receipt as ReceiptIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";

export const NodeOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canAdminNode = useCurrentUserHasPrivilege("node_administration");
  const canViewStats = useCurrentUserHasPrivilege("view_node_stats");
  const [generateReport, { isLoading: reportGenerating }] = useGenerateRevenueReportMutation();
  const isInEventContext = currentNode.event != null || currentNode.event_node_id != null;

  if (isInEventContext && !canAdminNode && canViewStats) {
    return <Navigate replace to={`/node/${currentNode.id}/stats`} />;
  }

  if (currentNode.event != null) {
    return <EventOverview />;
  }

  const openReportPreview = async () => {
    try {
      const resp = await generateReport({
        nodeId: currentNode.id,
      });
      const pdfUrl = (resp as any).data;
      if (pdfUrl === undefined) {
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
      {canAdminNode && (
        <LoadingButton
          variant="contained"
          onClick={openReportPreview}
          loading={reportGenerating}
          startIcon={<ReceiptIcon />}
          loadingPosition="start"
        >
          {t("overview.generateRevenueReport")}
        </LoadingButton>
      )}
    </Stack>
  );
};
