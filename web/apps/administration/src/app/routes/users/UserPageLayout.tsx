import { useNode } from "@api/nodes";
import { Person as PersonIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useParams, Link as RouterLink } from "react-router-dom";
import { Loading } from "@stustapay/components";
import { UserRoleRoutes, UserRoutes } from "@/app/routes";

const getActiveTab = (location: string) => {
  if (location.startsWith(UserRoleRoutes.list())) {
    return UserRoleRoutes.list();
  }
  return UserRoutes.list();
};

export const UserPageLayout: React.FC = () => {
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
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }} aria-label="Users">
        <Tab
          label={t("user.users")}
          component={RouterLink}
          icon={<PersonIcon />}
          iconPosition="start"
          value={UserRoutes.list()}
          to={UserRoutes.list()}
        />
        <Tab label={t("user.roles")} component={RouterLink} value={UserRoleRoutes.list()} to={UserRoleRoutes.list()} />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
