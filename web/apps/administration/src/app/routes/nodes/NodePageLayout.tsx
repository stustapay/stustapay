import {
  Dashboard as DashboardIcon,
  Leaderboard as LeaderboardIcon,
  Settings as SettingsIcon,
  List as ListIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { ResponsivePageTabs } from "@/components";
import { useCurrentNode } from "@/hooks";

import { EventPageLayout } from "./EventPageLayout";

export const NodePageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const nodeUrl = `/node/${currentNode.id}`;

  const tabs = React.useMemo(() => {
    const items = [
      {
        value: nodeUrl,
        label: t("nodes.overview"),
        to: nodeUrl,
        icon: <DashboardIcon />,
      },
    ];
    if (currentNode.event_node_id != null) {
      items.push(
        {
          value: `${nodeUrl}/stats`,
          label: t("nodes.statistics"),
          to: `${nodeUrl}/stats`,
          icon: <LeaderboardIcon />,
        },
        {
          value: `${nodeUrl}/reports`,
          label: t("nodes.reports"),
          to: `${nodeUrl}/reports`,
          icon: <ReceiptIcon />,
        }
      );
    }
    items.push(
      {
        value: `${nodeUrl}/audit-logs`,
        label: t("auditLog.auditLogs"),
        to: `${nodeUrl}/audit-logs`,
        icon: <ListIcon />,
      },
      {
        value: `${nodeUrl}/settings`,
        label: t("nodes.settings"),
        to: `${nodeUrl}/settings`,
        icon: <SettingsIcon />,
      }
    );
    return items;
  }, [currentNode.event_node_id, nodeUrl, t]);

  if (currentNode.event != null) {
    return <EventPageLayout node={currentNode} />;
  }

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
