import { useNode } from "@api/nodes";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useParams, Link as RouterLink } from "react-router-dom";
import { Loading } from "@stustapay/components";
import { UserTagRoutes } from "@/app/routes";

const getActiveTab = (location: string) => {
  return UserTagRoutes.list();
};

export const UserTagPageLayout: React.FC = () => {
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

  return (
    <Box>
      <Tabs
        value={getActiveTab(location.pathname)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
        aria-label="User Tags"
      >
        <Tab
          label={t("userTag.userTags")}
          component={RouterLink}
          value={UserTagRoutes.list()}
          to={UserTagRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
