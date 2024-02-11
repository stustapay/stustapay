import { useNode } from "@/api/nodes";
import { SumUpCheckoutRoutes, SumUpTransactionRoutes } from "@/app/routes";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(SumUpCheckoutRoutes.list())) {
    return SumUpCheckoutRoutes.list();
  }
  return SumUpTransactionRoutes.list();
};

export const SumUpPageLayout: React.FC = () => {
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

  return (
    <Box>
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab
          label={t("sumup.transactions")}
          component={RouterLink}
          value={SumUpTransactionRoutes.list()}
          to={SumUpTransactionRoutes.list()}
        />
        <Tab
          label={t("sumup.checkouts")}
          component={RouterLink}
          value={SumUpCheckoutRoutes.list()}
          to={SumUpCheckoutRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
