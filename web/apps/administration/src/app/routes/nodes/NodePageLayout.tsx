import { useNode } from "@api/nodes";
import {
  Dashboard as DashboardIcon,
  Leaderboard as LeaderboardIcon,
  Money as MoneyIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (nodeId: string, location: string) => {
  if (location.startsWith(`/node/${nodeId}/stats`)) {
    return `/node/${nodeId}/stats`;
  }
  if (location.startsWith(`/node/${nodeId}/settings`)) {
    return `/node/${nodeId}/settings`;
  }
  if (location.startsWith(`/node/${nodeId}/settings-legacy`)) {
    return `/node/${nodeId}/settings-legacy`;
  }
  if (location.startsWith(`/node/${nodeId}/payout-runs`)) {
    return `/node/${nodeId}/payout-runs`;
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
          label="Payouts"
          component={RouterLink}
          value={`${nodeUrl}/payout-runs`}
          icon={<MoneyIcon />}
          iconPosition="start"
          to={`${nodeUrl}/payout-runs`}
        />
        <Tab
          label={t("nodes.settings")}
          component={RouterLink}
          value={`${nodeUrl}/settings`}
          icon={<SettingsIcon />}
          iconPosition="start"
          to={`${nodeUrl}/settings`}
        />
        <Tab
          label="Settings Legacy"
          component={RouterLink}
          value={`${nodeUrl}/settings-legacy`}
          icon={<SettingsIcon />}
          iconPosition="start"
          to={`${nodeUrl}/settings-legacy`}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
