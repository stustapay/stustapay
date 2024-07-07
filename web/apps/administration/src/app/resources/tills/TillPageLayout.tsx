import { Folder as FolderIcon, Gamepad as GamepadIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useCreateNodePath } from "../components/useCreateNodePath";

const getActiveTab = (location: string, nodeId: number, createPath: ReturnType<typeof useCreateNodePath>) => {
  const profilesRoute = createPath({ resource: "till_profiles", type: "list", nodeId });
  if (location.startsWith(profilesRoute)) {
    return profilesRoute;
  }

  const layoutsRoute = createPath({ resource: "till_layouts", type: "list", nodeId });
  if (location.startsWith(layoutsRoute)) {
    return layoutsRoute;
  }

  const buttonsRoute = createPath({ resource: "till_buttons", type: "list", nodeId });
  if (location.startsWith(buttonsRoute)) {
    return buttonsRoute;
  }

  const registersRoute = createPath({ resource: "till_registers", type: "list", nodeId });
  if (location.startsWith(registersRoute)) {
    return registersRoute;
  }

  const stockingsRoute = createPath({ resource: "till_register_stockings", type: "list", nodeId });
  if (location.startsWith(stockingsRoute)) {
    return stockingsRoute;
  }
  return createPath({ resource: "tills", type: "list", nodeId });
};

export const TillPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const location = useLocation();
  const createPath = useCreateNodePath();

  return (
    <Box>
      <Tabs
        value={getActiveTab(location.pathname, Number(nodeId), createPath)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
        aria-label="Tills"
      >
        <Tab
          label={t("resources.tills.name", { count: 2 })}
          component={RouterLink}
          icon={<PointOfSaleIcon />}
          iconPosition="start"
          value={createPath({ resource: "tills", type: "list", nodeId })}
          to={createPath({ resource: "tills", type: "list", nodeId })}
        />
        <Tab
          label={t("resources.till_profiles.name", { count: 2 })}
          component={RouterLink}
          icon={<FolderIcon />}
          iconPosition="start"
          value={createPath({ resource: "till_profiles", type: "list", nodeId })}
          to={createPath({ resource: "till_profiles", type: "list", nodeId })}
        />
        <Tab
          label={t("resources.till_layouts.name", { count: 2 })}
          component={RouterLink}
          icon={<FolderIcon />}
          iconPosition="start"
          value={createPath({ resource: "till_layouts", type: "list", nodeId })}
          to={createPath({ resource: "till_layouts", type: "list", nodeId })}
        />
        <Tab
          label={t("resources.till_buttons.name", { count: 2 })}
          component={RouterLink}
          icon={<GamepadIcon />}
          iconPosition="start"
          value={createPath({ resource: "till_buttons", type: "list", nodeId })}
          to={createPath({ resource: "till_buttons", type: "list", nodeId })}
        />
        <Tab
          label={t("resources.till_registers.name", { count: 2 })}
          component={RouterLink}
          value={createPath({ resource: "till_registers", type: "list", nodeId })}
          to={createPath({ resource: "till_registers", type: "list", nodeId })}
        />
        <Tab
          label={t("resources.till_register_stockings.name", { count: 2 })}
          component={RouterLink}
          value={createPath({ resource: "till_register_stockings", type: "list", nodeId })}
          to={createPath({ resource: "till_register_stockings", type: "list", nodeId })}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
