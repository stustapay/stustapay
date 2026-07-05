import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { UserTagRoutes } from "@/app/routes";

const getActiveTab = (location: string) => {
  if (location.endsWith("create-tags")) {
    return UserTagRoutes.action("create-tags");
  }
  if (location.endsWith("create-secret")) {
    return UserTagRoutes.action("create-secret");
  }
  return UserTagRoutes.list();
};

export const UserTagPageLayout: React.FC = withTreeObjectGuard("user_tag", () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Box>
      <Tabs
        value={getActiveTab(location.pathname)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
        aria-label="User Tags"
      >
        <Tab label={t("userTag.find")} component={RouterLink} value={UserTagRoutes.list()} to={UserTagRoutes.list()} />
        <Tab
          label={t("userTag.createButton")}
          component={RouterLink}
          value={UserTagRoutes.action("create-tags")}
          to={UserTagRoutes.action("create-tags")}
        />
        <Tab
          label={t("userTagSecret.createButton")}
          component={RouterLink}
          value={UserTagRoutes.action("create-secret")}
          to={UserTagRoutes.action("create-secret")}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
