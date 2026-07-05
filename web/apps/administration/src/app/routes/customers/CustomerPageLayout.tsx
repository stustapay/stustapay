import { Search as SearchIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { CustomerRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";
import { useCurrentNode } from "@/hooks";

export const CustomerPageLayout: React.FC = withTreeObjectGuard("account", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const tabs = React.useMemo(
    () => [
      {
        value: CustomerRoutes.list(),
        label: t("common.search"),
        to: CustomerRoutes.list(),
        icon: <SearchIcon />,
      },
      {
        value: CustomerRoutes.action("swap-tag"),
        label: t("customer.swapTag"),
        to: CustomerRoutes.action("swap-tag"),
        icon: <SwapHorizIcon />,
      },
      {
        value: CustomerRoutes.action("blocked-payout"),
        label: t("customer.customersWithBlockedPayout"),
        to: CustomerRoutes.action("blocked-payout"),
      },
    ],
    [t]
  );

  if (currentNode.event == null) {
    // TODO: proper error redirect
    return <Navigate to="/" />;
  }

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
