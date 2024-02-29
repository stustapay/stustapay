import { useNode } from "@/api/nodes";
import { CustomerRoutes } from "@/app/routes";
import { Dashboard as DashboardIcon, Search as SearchIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams, Navigate } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(CustomerRoutes.action("search"))) {
    return CustomerRoutes.action("search");
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
          label={t("common.overview")}
          component={RouterLink}
          icon={<DashboardIcon />}
          iconPosition="start"
          value={CustomerRoutes.list()}
          to={CustomerRoutes.list()}
        />
        <Tab
          label={t("common.search")}
          icon={<SearchIcon />}
          iconPosition="start"
          component={RouterLink}
          value={CustomerRoutes.action("search")}
          to={CustomerRoutes.action("search")}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
