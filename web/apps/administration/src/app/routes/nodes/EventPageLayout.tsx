import { Node } from "@/api";
import { PayoutRunRoutes, TaxRateRoutes } from "@/app/routes";
import {
  Dashboard as DashboardIcon,
  Leaderboard as LeaderboardIcon,
  Money as MoneyIcon,
  Percent as PercentIcon,
  Settings as SettingsIcon,
  HistoryEdu as HistoryEduIcon,
  List as ListIcon,
} from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";

const getActiveTab = (nodeId: number, location: string) => {
  if (location.startsWith(`/node/${nodeId}/stats`)) {
    return `/node/${nodeId}/stats`;
  }
  if (location.startsWith(`/node/${nodeId}/settings`)) {
    return `/node/${nodeId}/settings`;
  }
  if (location.startsWith(`/node/${nodeId}/system-accounts`)) {
    return `/node/${nodeId}/system-accounts`;
  }
  if (location.startsWith(PayoutRunRoutes.list(nodeId))) {
    return PayoutRunRoutes.list(nodeId);
  }
  if (location.startsWith(TaxRateRoutes.list(nodeId))) {
    return TaxRateRoutes.list(nodeId);
  }
  if (location.startsWith(`/node/${nodeId}/dsfinvk`)) {
    return `/node/${nodeId}/dsfinvk`;
  }
  if (location.startsWith(`/node/${nodeId}/audit-logs`)) {
    return `/node/${nodeId}/audit-logs`;
  }
  return `/node/${nodeId}`;
};

export const EventPageLayout: React.FC<{ node: Node }> = ({ node }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const nodeUrl = `/node/${node.id}`;

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: "divider" }}
        value={getActiveTab(node.id, location.pathname)}
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
          label={t("systemAccounts")}
          component={RouterLink}
          value={`${nodeUrl}/system-accounts`}
          iconPosition="start"
          to={`${nodeUrl}/system-accounts`}
        />
        <Tab
          label="Tax Rates"
          component={RouterLink}
          value={TaxRateRoutes.list()}
          icon={<PercentIcon />}
          iconPosition="start"
          to={TaxRateRoutes.list()}
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
          label={t("dsfinvk")}
          component={RouterLink}
          value={`${nodeUrl}/dsfinvk`}
          icon={<HistoryEduIcon />}
          iconPosition="start"
          to={`${nodeUrl}/dsfinvk`}
        />
        <Tab
          label={t("auditLog.auditLogs")}
          component={RouterLink}
          value={`${nodeUrl}/audit-logs`}
          icon={<ListIcon />}
          iconPosition="start"
          to={`${nodeUrl}/audit-logs`}
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
