import { useNode } from "@api/nodes";
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Leaderboard as LeaderboardIcon,
} from "@mui/icons-material";
import { Box, Tabs, Tab } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams, Link as RouterLink, Outlet } from "react-router-dom";
import { Loading } from "@stustapay/components";

const getActiveTab = (nodeId: string, location: string) => {
  if (location.startsWith(`/node/${nodeId}/stats`)) {
    return `/node/${nodeId}/stats`;
  }
  if (location.startsWith(`/node/${nodeId}/settings`)) {
    return `/node/${nodeId}/settings`;
  }
  return `/node/${nodeId}`;
};

export const NodePageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: nodeId ?? "" });
  const location = useLocation();

  if (!nodeId) {
    // TODO: return error page / redirect
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  const nodeUrl = `/node/${nodeId}`;

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: "divider" }}
        value={getActiveTab(nodeId, location.pathname)}
        aria-label="Users"
      >
        <Tab
          label={t("nodes.overview")}
          component={RouterLink}
          value={nodeUrl}
          icon={<DashboardIcon />}
          iconPosition="start"
          to={nodeUrl}
        />
        <Tab
          label={t("nodes.statistics")}
          component={RouterLink}
          value={`${nodeUrl}/stats`}
          icon={<LeaderboardIcon />}
          iconPosition="start"
          to={`${nodeUrl}/stats`}
        />
        <Tab
          label={t("nodes.settings")}
          component={RouterLink}
          value={`${nodeUrl}/settings`}
          icon={<SettingsIcon />}
          iconPosition="start"
          to={`${nodeUrl}/settings`}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
