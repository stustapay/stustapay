import { useNode } from "@/api/nodes";
import { EntryAreaRoutes, EntryGroupRoutes, EntryLogRoutes } from "@/app/routes";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(EntryGroupRoutes.list())) {
    return EntryGroupRoutes.list();
  }
  if (location.startsWith(EntryLogRoutes.list())) {
    return EntryLogRoutes.list();
  }
  return EntryAreaRoutes.list();
};

export const EntryPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });
  const location = useLocation();

  if (!nodeId) {
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box>
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab label={t("entry.areas")} component={RouterLink} value={EntryAreaRoutes.list()} to={EntryAreaRoutes.list()} />
        <Tab
          label={t("entry.groups")}
          component={RouterLink}
          value={EntryGroupRoutes.list()}
          to={EntryGroupRoutes.list()}
        />
        <Tab
          label={t("entry.logs")}
          component={RouterLink}
          value={EntryLogRoutes.list()}
          to={EntryLogRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
