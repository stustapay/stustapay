import { NodeSeenByUser, Privilege, useGenerateRevenueReportMutation } from "@/api";
import { useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";
import * as React from "react";
import { EventOverview } from "../event-overview";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Receipt as ReceiptIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Link as RouterLink, Navigate } from "react-router-dom";

type ActionableNodeTarget = {
  nodeId: number;
  route: string;
  depth: number;
  label: string;
  privilege: Privilege;
};

const getOverviewRoute = (node: NodeSeenByUser): string => {
  if (node.privileges_at_node.includes("node_administration")) {
    return `/node/${node.id}`;
  }

  return `/node/${node.id}/stats`;
};

const findActionableDescendants = (startNode: NodeSeenByUser): ActionableNodeTarget[] => {
  const actionableNodes: ActionableNodeTarget[] = [];
  const queue: Array<{ node: NodeSeenByUser; depth: number }> = startNode.children.map((child) => ({
    node: child,
    depth: 1,
  }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const privilege = current.node.privileges_at_node.includes("node_administration")
      ? "node_administration"
      : current.node.privileges_at_node.includes("view_node_stats")
        ? "view_node_stats"
        : null;

    if (privilege != null) {
      actionableNodes.push({
        nodeId: current.node.id,
        route: getOverviewRoute(current.node),
        depth: current.depth,
        label: current.node.name,
        privilege,
      });
    }

    for (const child of current.node.children) {
      queue.push({ node: child, depth: current.depth + 1 });
    }
  }

  actionableNodes.sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }

    if (left.privilege !== right.privilege) {
      return left.privilege === "node_administration" ? -1 : 1;
    }

    return left.label.localeCompare(right.label);
  });

  return actionableNodes;
};

const EventOverviewFallback: React.FC<{ actionableNodes: ActionableNodeTarget[] }> = ({ actionableNodes }) => {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        <Typography variant="body2">{t("overview.scopedOverviewUnavailable")}</Typography>
      </Alert>
      <Stack spacing={1}>
        <Typography variant="subtitle1">{t("overview.openAccessibleSubnode")}</Typography>
        {actionableNodes.map((node) => (
          <Button key={node.nodeId} component={RouterLink} to={node.route} variant="outlined" sx={{ justifyContent: "flex-start" }}>
            {node.label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
};

export const NodeOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canAdminNode = useCurrentUserHasPrivilege("node_administration");
  const canViewStats = useCurrentUserHasPrivilege("view_node_stats");
  const [generateReport, { isLoading: reportGenerating }] = useGenerateRevenueReportMutation();
  const isInEventContext = currentNode.event != null || currentNode.event_node_id != null;
  const actionableDescendants = React.useMemo(() => findActionableDescendants(currentNode), [currentNode]);
  const nearestActionableDepth = actionableDescendants[0]?.depth;
  const nearestActionableNodes = actionableDescendants.filter((node) => node.depth === nearestActionableDepth);
  const shouldRedirectScopedEventRoot =
    currentNode.event != null &&
    !canAdminNode &&
    !canViewStats &&
    nearestActionableNodes.length === 1;

  const downloadRevenueReport = async () => {
    try {
      const pdfUrl = await generateReport({
        nodeId: currentNode.id,
      }).unwrap();
      const link = document.createElement("a");

      try {
        link.setAttribute("href", pdfUrl);
        link.setAttribute("download", `revenue_report_${currentNode.id}.pdf`);
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 100);
      }
    } catch {
      toast.error(t("overview.generateRevenueReportError"));
    }
  };

  const revenueReportButton = isInEventContext && canAdminNode && (
    <LoadingButton
      variant="contained"
      onClick={downloadRevenueReport}
      loading={reportGenerating}
      startIcon={<ReceiptIcon />}
      loadingPosition="start"
    >
      {t("overview.generateRevenueReport")}
    </LoadingButton>
  );

  if (shouldRedirectScopedEventRoot) {
    return <Navigate replace to={nearestActionableNodes[0].route} />;
  }

  if (currentNode.event != null && !canAdminNode && canViewStats) {
    return <Navigate replace to={`/node/${currentNode.id}/stats`} />;
  }

  if (currentNode.event == null && isInEventContext && !canAdminNode && canViewStats) {
    return <Navigate replace to={`/node/${currentNode.id}/stats`} />;
  }

  if (currentNode.event != null) {
    if (!canAdminNode) {
      return <EventOverviewFallback actionableNodes={nearestActionableNodes} />;
    }

    return (
      <Stack spacing={2}>
        {revenueReportButton}
        <EventOverview />
      </Stack>
    );
  }

  return <Stack spacing={2}>{revenueReportButton}</Stack>;
};
