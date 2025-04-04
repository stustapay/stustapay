import { useNode } from "@/api/nodes";
import { CustomerRoutes } from "@/app/routes";
import { Search as SearchIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(CustomerRoutes.action("blocked-payout"))) {
    return CustomerRoutes.action("blocked-payout");
  }
  return CustomerRoutes.list();
};

export const CustomerPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });
  const location = useLocation();

  if (!nodeId) {
    // TODO: return error page / redirect
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  if (node.event == null) {
    // TODO: proper error redirect
    return <Navigate to="/" />;
  }

  return (
    <Box>
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab
          label={t("common.search")}
          icon={<SearchIcon />}
          iconPosition="start"
          component={RouterLink}
          value={CustomerRoutes.list()}
          to={CustomerRoutes.list()}
        />
        <Tab
          label={t("customer.customersWithBlockedPayout")}
          component={RouterLink}
          value={CustomerRoutes.action("blocked-payout")}
          to={CustomerRoutes.action("blocked-payout")}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
