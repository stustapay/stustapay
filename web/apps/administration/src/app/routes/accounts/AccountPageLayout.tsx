import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { AccountRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const AccountPageLayout: React.FC = withTreeObjectGuard("account", () => {
  const { t } = useTranslation();

  const tabs = React.useMemo(
    () => [
      {
        value: AccountRoutes.list(),
        label: t("account.overview"),
        to: AccountRoutes.list(),
      },
      {
        value: `${AccountRoutes.list()}/system`,
        label: t("systemAccounts"),
        to: `${AccountRoutes.list()}/system`,
      },
      {
        value: `${AccountRoutes.list()}/find`,
        label: t("findAccounts"),
        to: `${AccountRoutes.list()}/find`,
      },
    ],
    [t]
  );

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} ariaLabel="Users" />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
