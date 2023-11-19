import { useNode } from "@/api/nodes";
import { UserRoleRoutes, UserRoutes } from "@/app/routes";
import { Person as PersonIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(UserRoleRoutes.list())) {
    return UserRoleRoutes.list();
  }
  return UserRoutes.list();
};

export const UserPageLayout: React.FC = () => {
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

  if (node.computed_forbidden_objects_at_node.includes("user_role")) {
    return (
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    );
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
