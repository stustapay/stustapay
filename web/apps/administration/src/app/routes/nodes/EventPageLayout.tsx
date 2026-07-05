import {
  Dashboard as DashboardIcon,
  Leaderboard as LeaderboardIcon,
  Money as MoneyIcon,
  Percent as PercentIcon,
  Settings as SettingsIcon,
  HistoryEdu as HistoryEduIcon,
  List as ListIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Node } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const EventPageLayout: React.FC<{ node: Node }> = ({ node }) => {
  const { t } = useTranslation();
  const nodeUrl = `/node/${node.id}`;

  const tabs = React.useMemo(
    () => [
      {
        value: nodeUrl,
        label: t("nodes.overview"),
        to: nodeUrl,
        icon: <DashboardIcon />,
      },
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
      },
      {
        value: `${nodeUrl}/system-accounts`,
        label: t("systemAccounts"),
        to: `${nodeUrl}/system-accounts`,
      },
      {
        value: TaxRateRoutes.list(),
        label: "Tax Rates",
        to: TaxRateRoutes.list(),
        icon: <PercentIcon />,
      },
      {
        value: `${nodeUrl}/payout-runs`,
        label: "Payouts",
        to: `${nodeUrl}/payout-runs`,
        icon: <MoneyIcon />,
      },
      {
        value: `${nodeUrl}/dsfinvk`,
        label: t("dsfinvk"),
        to: `${nodeUrl}/dsfinvk`,
        icon: <HistoryEduIcon />,
      },
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
      },
    ],
    [nodeUrl, t]
  );

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
