import { useNode } from "@api/nodes";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useParams, Link as RouterLink } from "react-router-dom";
import { Loading } from "@stustapay/components";
import { AccountRoutes } from "@/app/routes";

const getActiveTab = (location: string) => {
  if (location.startsWith(AccountRoutes.list() + "/system")) {
    return AccountRoutes.list() + "/system";
  }
  if (location.startsWith(AccountRoutes.list() + "/find")) {
    return AccountRoutes.list() + "/find";
  }
  return AccountRoutes.list();
};

export const AccountPageLayout: React.FC = () => {
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
      <Tabs value={getActiveTab(location.pathname)} aria-label="Users">
        <Tab
          label={t("account.overview")}
          component={RouterLink}
          value={AccountRoutes.list()}
          to={AccountRoutes.list()}
        />
        <Tab
          label={t("systemAccounts")}
          component={RouterLink}
          value={`${AccountRoutes.list()}/system`}
          to={`${AccountRoutes.list()}/system`}
        />
        <Tab
          label={t("findAccounts")}
          component={RouterLink}
          value={`${AccountRoutes.list()}/find`}
          to={`${AccountRoutes.list()}/find`}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
